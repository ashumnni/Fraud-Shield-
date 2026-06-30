"""
SQLAlchemy database setup for Fraud Shield.
Uses SQLite for development (zero-config), PostgreSQL schema compatible.
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fraud_shield.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize the database with the schema."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r") as f:
        schema_sql = f.read()

    with engine.connect() as conn:
        # Remove inline comments then split by semicolon
        lines = [line for line in schema_sql.splitlines() if not line.strip().startswith("--")]
        clean_sql = "\n".join(lines)
        statements = [s.strip() for s in clean_sql.split(";") if s.strip()]
        for statement in statements:
            try:
                conn.execute(text(statement))
            except Exception:
                pass  # table may already exist
        conn.commit()

