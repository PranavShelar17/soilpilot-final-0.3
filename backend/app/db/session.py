import logging
from typing import Generator
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.db.base import Base

logger = logging.getLogger(__name__)

def create_db_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql"):
        try:
            import socket
            from urllib.parse import urlparse
            parsed = urlparse(db_url)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 5432
            # Ultra-fast 0.2s socket probe to check if PostgreSQL port is open before initializing psycopg2
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.2)
            conn_res = sock.connect_ex((host, port))
            sock.close()
            if conn_res != 0:
                raise ConnectionRefusedError(f"PostgreSQL port {port} on {host} is not reachable")

            # Fast ping check to verify if PostgreSQL is actively accepting connections
            test_engine = create_engine(db_url, connect_args={"connect_timeout": 2})
            with test_engine.connect():
                pass
            test_engine.dispose()
            logger.info("Connected to PostgreSQL database.")
            return create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
        except Exception as err:
            logger.warning(
                f"PostgreSQL connection at {db_url} is unavailable ({err}). "
                "Using local SQLite database fallback for development."
            )
            # Ensure database directory exists (handle read-only filesystems in serverless like Vercel)
            try:
                db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../database"))
                os.makedirs(db_dir, exist_ok=True)
                sqlite_path = os.path.join(db_dir, "soilpilot.db")
            except OSError:
                sqlite_path = "/tmp/soilpilot.db"
            sqlite_url = f"sqlite:///{sqlite_path}"
            engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
            Base.metadata.create_all(engine)
            return engine
    else:
        connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
        engine = create_engine(db_url, connect_args=connect_args)
        if "sqlite" in db_url:
            Base.metadata.create_all(engine)
        return engine

engine = create_db_engine()

# Ensure all models are loaded in Base.metadata and tables created
import app.models  # noqa: F401
Base.metadata.create_all(engine)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining database sessions per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
