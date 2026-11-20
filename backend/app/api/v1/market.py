"""FastAPI Endpoints for APMC Daily Market Prices & Pune APMC Portal.
Provides endpoints for Pune APMC live and historical prices as specified in Master Prompt Section 8:
- GET /api/v1/market/prices
- GET /api/v1/market/latest
- GET /api/v1/market/sections
- GET /api/v1/market/commodities
- GET /api/v1/market/history
- GET /api/v1/market/sync-status
- POST /api/v1/market/sync
"""

from datetime import date, datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, desc, func

from app.db.session import get_db
from app.models.market_intelligence import ApmcDailyMarketPrice, MarketPriceObservation
from app.services.pune_apmc_crawler import pune_apmc_crawler, APMC_PUNE_SECTIONS, TARGET_ALLOWED_CROPS

router = APIRouter(prefix="/market", tags=["APMC Market Prices"])

# 7-crop relevant APMC sections
SECTIONS_7_CROPS = [
    s for s in APMC_PUNE_SECTIONS if s["id"] in {
        "main-kanda", "main-veg", "main-fruit", "main-gul-bhusar-dhanya",
        "keli-paan", "moshi-onion", "moshi-veg", "moshi-fruit",
        "manjari-onion", "manjari-veg", "manjari-fruit"
    }
]


@router.get("/sections", summary="Retrieve configured APMC market sections for 7 target crops")
def get_market_sections():
    """Returns the list of official APMC Pune market sections hosting the 7 target crops."""
    return {
        "status": "success",
        "total": len(SECTIONS_7_CROPS),
        "sections": SECTIONS_7_CROPS,
    }


@router.get("/commodities", summary="Retrieve available APMC commodity names (7 target crops)")
def get_market_commodities(
    section: Optional[str] = Query(None, description="Filter by section identifier (e.g. main-kanda, main-veg)"),
    db: Session = Depends(get_db),
):
    """Returns distinct commodities available in the APMC database restricted to the 7 target crops."""
    query = db.query(
        ApmcDailyMarketPrice.commodity_name,
        ApmcDailyMarketPrice.original_commodity_name,
        ApmcDailyMarketPrice.commodity_code,
        ApmcDailyMarketPrice.unit,
    ).filter(ApmcDailyMarketPrice.commodity_code.in_(TARGET_ALLOWED_CROPS))
    if section:
        query = query.filter(ApmcDailyMarketPrice.market_section == section)

    results = query.distinct().order_by(ApmcDailyMarketPrice.commodity_name).all()

    commodities = [
        {
            "commodity_name": r[0],
            "original_commodity_name": r[1],
            "commodity_code": r[2],
            "unit": r[3],
        }
        for r in results
    ]

    return {
        "status": "success",
        "total": len(commodities),
        "commodities": commodities,
    }


@router.get("/latest", summary="Retrieve the latest available market records across sections (7 crops)")
def get_latest_market_records(
    section: Optional[str] = Query(None, description="Optional APMC section filter"),
    market: Optional[str] = Query(None, description="Optional market/submarket name filter"),
    search: Optional[str] = Query(None, description="Search commodity name (English or Marathi)"),
    limit: int = Query(150, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db),
):
    """
    Returns the freshest published daily auction prices from Pune APMC for the 7 target crops.
    Automatically determines the latest available date in the database.
    """
    # Find latest date in DB
    latest_date = db.query(func.max(ApmcDailyMarketPrice.market_date)).filter(
        ApmcDailyMarketPrice.commodity_code.in_(TARGET_ALLOWED_CROPS)
    ).scalar()
    if not latest_date:
        # Trigger crawl if empty
        pune_apmc_crawler.ingest_into_database(db, max_days_back=2)
        latest_date = db.query(func.max(ApmcDailyMarketPrice.market_date)).filter(
            ApmcDailyMarketPrice.commodity_code.in_(TARGET_ALLOWED_CROPS)
        ).scalar()

    query = db.query(ApmcDailyMarketPrice).filter(
        ApmcDailyMarketPrice.market_date == latest_date,
        ApmcDailyMarketPrice.commodity_code.in_(TARGET_ALLOWED_CROPS),
    )

    if section and section != "all":
        query = query.filter(ApmcDailyMarketPrice.market_section == section)

    if market:
        query = query.filter(ApmcDailyMarketPrice.market_name.ilike(f"%{market}%"))

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ApmcDailyMarketPrice.commodity_name.ilike(search_pattern),
                ApmcDailyMarketPrice.original_commodity_name.ilike(search_pattern),
            )
        )

    records = query.order_by(ApmcDailyMarketPrice.market_section, ApmcDailyMarketPrice.commodity_name).limit(limit).all()

    return {
        "status": "success",
        "market_date": latest_date.isoformat() if latest_date else None,
        "market_name": "Pune APMC",
        "source": "https://apmcpune.in/en/market-price-en/daily-market-price-en",
        "total": len(records),
        "records": [
            {
                "id": r.id,
                "commodity_name": r.commodity_name,
                "original_commodity_name": r.original_commodity_name,
                "commodity_code": r.commodity_code,
                "market_name": r.market_name,
                "market_section": r.market_section,
                "market_section_name": r.market_section_name,
                "market_date": r.market_date.isoformat(),
                "unit": r.unit,
                "arrival_quantity": r.arrival_quantity,
                "minimum_price": r.minimum_price,
                "maximum_price": r.maximum_price,
                "average_price": r.average_price,
                "source_url": r.source_url,
                "fetched_at": r.fetched_at.isoformat() if r.fetched_at else None,
            }
            for r in records
        ],
    }


@router.get("/prices", summary="Retrieve market prices using filters")
def get_market_prices(
    commodity: Optional[str] = Query(None, description="Commodity name or code"),
    market: Optional[str] = Query(None, description="Market name (e.g. Pune)"),
    section: Optional[str] = Query(None, description="Section identifier"),
    date_str: Optional[str] = Query(None, alias="date", description="Target market date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Query APMC daily market prices by commodity, section, date, or market (strictly 7 target crops)."""
    query = db.query(ApmcDailyMarketPrice).filter(ApmcDailyMarketPrice.commodity_code.in_(TARGET_ALLOWED_CROPS))

    if commodity:
        pattern = f"%{commodity.strip()}%"
        query = query.filter(
            or_(
                ApmcDailyMarketPrice.commodity_name.ilike(pattern),
                ApmcDailyMarketPrice.original_commodity_name.ilike(pattern),
                ApmcDailyMarketPrice.commodity_code.ilike(pattern),
            )
        )

    if market:
        query = query.filter(ApmcDailyMarketPrice.market_name.ilike(f"%{market}%"))

    if section and section != "all":
        query = query.filter(ApmcDailyMarketPrice.market_section == section)

    if date_str:
        try:
            d = date.fromisoformat(date_str)
            query = query.filter(ApmcDailyMarketPrice.market_date == d)
        except ValueError:
            pass

    total = query.count()
    records = query.order_by(desc(ApmcDailyMarketPrice.market_date), ApmcDailyMarketPrice.commodity_name).offset(offset).limit(limit).all()

    return {
        "status": "success",
        "total": total,
        "offset": offset,
        "limit": limit,
        "records": [
            {
                "id": r.id,
                "commodity_name": r.commodity_name,
                "original_commodity_name": r.original_commodity_name,
                "commodity_code": r.commodity_code,
                "market_name": r.market_name,
                "market_section": r.market_section,
                "market_section_name": r.market_section_name,
                "market_date": r.market_date.isoformat(),
                "unit": r.unit,
                "arrival_quantity": r.arrival_quantity,
                "minimum_price": r.minimum_price,
                "maximum_price": r.maximum_price,
                "average_price": r.average_price,
                "source_url": r.source_url,
            }
            for r in records
        ],
    }


@router.get("/history", summary="Retrieve historical commodity prices from APMC records")
def get_commodity_price_history(
    commodity: str = Query(..., description="Commodity name (e.g. Onion, Tomato, कांदा) or code"),
    days: int = Query(30, ge=1, le=180, description="Number of past days to query"),
    db: Session = Depends(get_db),
):
    """Returns price time series (Min, Max, Average, Arrival) for a given commodity."""
    pattern = f"%{commodity.strip()}%"
    cutoff = date.today() - timedelta(days=days)

    records = db.query(ApmcDailyMarketPrice).filter(
        and_(
            or_(
                ApmcDailyMarketPrice.commodity_name.ilike(pattern),
                ApmcDailyMarketPrice.original_commodity_name.ilike(pattern),
                ApmcDailyMarketPrice.commodity_code.ilike(pattern),
            ),
            ApmcDailyMarketPrice.market_date >= cutoff,
        )
    ).order_by(ApmcDailyMarketPrice.market_date.asc()).all()

    return {
        "status": "success",
        "commodity": commodity,
        "days": days,
        "total_observations": len(records),
        "history": [
            {
                "date": r.market_date.isoformat(),
                "minimum_price": r.minimum_price,
                "maximum_price": r.maximum_price,
                "average_price": r.average_price,
                "arrival_quantity": r.arrival_quantity,
                "unit": r.unit,
                "market_name": r.market_name,
                "section": r.market_section,
            }
            for r in records
        ],
    }


@router.get("/sync-status", summary="Retrieve the last successful synchronisation and current data status")
def get_sync_status(db: Session = Depends(get_db)):
    """Provides current synchronization metadata, latest available date, and total records."""
    latest_date = db.query(func.max(ApmcDailyMarketPrice.market_date)).scalar()
    total_records = db.query(ApmcDailyMarketPrice).count()
    status_info = pune_apmc_crawler.get_sync_status()

    return {
        "status": "success",
        "crawler_state": status_info["status"],
        "latest_market_date": latest_date.isoformat() if latest_date else status_info.get("latest_market_date"),
        "last_sync_time": status_info.get("last_sync_time"),
        "total_records_in_db": total_records,
        "sections_configured": len(APMC_PUNE_SECTIONS),
        "error": status_info.get("error"),
    }


@router.post("/sync", summary="Manually trigger synchronisation with APMC Pune portal")
def trigger_market_sync(
    days_back: int = Query(3, ge=1, le=10, description="How many days back to check"),
    db: Session = Depends(get_db),
):
    """Scrapes freshly published auction data from apmcpune.in and updates SoilPilot database."""
    return pune_apmc_crawler.ingest_into_database(db, max_days_back=days_back)
