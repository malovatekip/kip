from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kip.db")

# SQLite needs this setting; PostgreSQL does not
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    # Neon (and most managed Postgres) silently closes idle connections;
    # without these, SQLAlchemy hands out dead connections from the pool
    # and requests fail with "SSL connection has been closed unexpectedly".
    pool_pre_ping=True,
    pool_recycle=280,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency: yields a database session, closes it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
