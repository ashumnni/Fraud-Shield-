"""
Fraud Shield FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db.database import init_db
from .models.ml_engine import get_ml_engine
from .models.simulator import start_simulator
from .routers import transactions, stream, analytics, cases, simulator, settings

app = FastAPI(
    title="Fraud Shield API",
    description="AI-Powered Real-Time Fraud Detection Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(transactions.router)
app.include_router(stream.router)
app.include_router(analytics.router)
app.include_router(cases.router)
app.include_router(simulator.router)
app.include_router(settings.router)


@app.on_event("startup")
async def startup_event():
    print("🚀 Fraud Shield API starting...")
    # Initialize database
    init_db()
    print("✅ Database initialized")
    # Train / load ML model
    get_ml_engine()
    # Auto-start simulator for demo
    await start_simulator()
    print("✅ Transaction simulator started")
    print("✅ Fraud Shield API ready at http://localhost:8000")
    print("📚 API docs at http://localhost:8000/docs")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "fraud-shield-api"}


@app.get("/")
async def root():
    return {
        "service": "Fraud Shield API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
