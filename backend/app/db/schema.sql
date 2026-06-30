-- Fraud Shield PostgreSQL Schema
-- Compatible with SQLite (via SQLAlchemy)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risk_score REAL DEFAULT 0.0,
    is_frozen BOOLEAN DEFAULT FALSE,
    quarantine_status TEXT DEFAULT 'ACTIVE',
    known_devices TEXT DEFAULT '[]',     -- JSON array of device fingerprints
    known_locations TEXT DEFAULT '[]'    -- JSON array of {country, city, lat, lng}
);

CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    country TEXT NOT NULL,
    risk_score REAL DEFAULT 0.0,
    total_transactions INTEGER DEFAULT 0,
    fraud_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    fingerprint TEXT UNIQUE NOT NULL,
    user_id TEXT REFERENCES users(id),
    device_type TEXT,          -- mobile, desktop, tablet
    os TEXT,
    browser TEXT,
    is_emulator BOOLEAN DEFAULT FALSE,
    is_rooted BOOLEAN DEFAULT FALSE,
    vpn_detected BOOLEAN DEFAULT FALSE,
    tor_detected BOOLEAN DEFAULT FALSE,
    quarantine_status TEXT DEFAULT 'ACTIVE',
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geo_events (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    transaction_id TEXT,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distance_from_last_km REAL DEFAULT 0.0,
    impossible_travel BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    merchant_id TEXT REFERENCES merchants(id),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    device_fingerprint TEXT,
    vpn_detected BOOLEAN DEFAULT FALSE,
    tor_detected BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- ML Results
    fraud_probability REAL,
    risk_score INTEGER,
    risk_level TEXT,           -- LOW, MEDIUM, HIGH
    decision TEXT,             -- APPROVE, HOLD, BLOCK
    latency_ms INTEGER,
    flags TEXT DEFAULT '[]',   -- JSON array of flag strings
    -- Status
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, BLOCKED, INVESTIGATING
    is_fraud BOOLEAN,          -- ground truth (set by analyst)
    reviewed_by TEXT,
    reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model_predictions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES transactions(id),
    model_name TEXT NOT NULL,
    prediction REAL NOT NULL,
    prediction_time_ms REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shap_explanations (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES transactions(id),
    feature_name TEXT NOT NULL,
    feature_label TEXT NOT NULL,
    feature_value REAL NOT NULL,
    shap_value REAL NOT NULL,
    direction TEXT NOT NULL     -- increases_risk, decreases_risk
);

CREATE TABLE IF NOT EXISTS fraud_cases (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES transactions(id),
    user_id TEXT REFERENCES users(id),
    status TEXT DEFAULT 'NEW',  -- NEW, REVIEWING, ESCALATED, RESOLVED_FRAUD, RESOLVED_LEGITIMATE
    priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    assigned_to TEXT,
    notes TEXT DEFAULT '[]',    -- JSON array of {analyst, note, timestamp}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution TEXT
);

CREATE TABLE IF NOT EXISTS velocity_windows (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    window_type TEXT NOT NULL,  -- 1min, 5min, 1hr, 24hr
    count INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0.0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_end TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    field TEXT NOT NULL,
    operator TEXT NOT NULL,
    value TEXT NOT NULL,
    action TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_risk_level ON transactions(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_status ON fraud_cases(status);
CREATE INDEX IF NOT EXISTS idx_geo_events_user_id ON geo_events(user_id);
