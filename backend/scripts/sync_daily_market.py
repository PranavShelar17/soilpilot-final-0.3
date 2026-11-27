"""
SoilPilot Standalone Daily APMC Market Ingestion Script.
Can be invoked directly by Windows Task Scheduler, cron, or GitHub Actions.
"""

import sys
import os
import logging
from datetime import date

# Add parent directory to sys.path so app modules import properly
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sync_daily_market")

def main():
    logger.info("Initializing daily APMC Pune market sync...")
    today = date.today()
    logger.info("Target execution date: %s", today.isoformat())

    try:
        from app.db.session import SessionLocal
        from app.services.pune_apmc_crawler import pune_apmc_crawler, TARGET_ALLOWED_CROPS
        from app.models.market_intelligence import ApmcDailyMarketPrice
        from sqlalchemy import func

        db = SessionLocal()
        try:
            # Check existing count for today
            today_count = db.query(func.count(func.distinct(ApmcDailyMarketPrice.commodity_code))).filter(
                ApmcDailyMarketPrice.market_date == today,
                ApmcDailyMarketPrice.commodity_code.in_(TARGET_ALLOWED_CROPS),
            ).scalar() or 0

            logger.info("Current records for %s: %d / 7 crops", today, today_count)

            # Ingest fresh records
            result = pune_apmc_crawler.ingest_into_database(db, max_days_back=3)
            logger.info("Ingestion result: %s", result)

            # Re-verify
            after_count = db.query(func.count(func.distinct(ApmcDailyMarketPrice.commodity_code))).filter(
                ApmcDailyMarketPrice.market_date == today,
                ApmcDailyMarketPrice.commodity_code.in_(TARGET_ALLOWED_CROPS),
            ).scalar() or 0

            logger.info("Final confirmed records for %s: %d / 7 crops", today, after_count)
            return 0
        finally:
            db.close()
    except Exception as err:
        logger.error("Failed to run daily market sync: %s", err, exc_info=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())
