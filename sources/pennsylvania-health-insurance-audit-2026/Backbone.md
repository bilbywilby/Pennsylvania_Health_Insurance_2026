#Backbone

## 1. SQL Schema Dump (`schema.sql`)

```sql
-- ============================================================================
-- PA HEALTH INSURANCE AUDIT - DATABASE SCHEMA
-- ============================================================================
-- SQLite 3.35+ required
-- Generated: 2026-10-09
-- Version: 1.0.0
-- ============================================================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- AUDITS TABLE - Monthly audit reports and summary metrics
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_date TEXT NOT NULL UNIQUE CHECK(audit_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    comparison_period TEXT NOT NULL,
    overall_status TEXT NOT NULL CHECK(overall_status IN ('STABLE', 'WARNING', 'CRITICAL')),

    -- Metrics snapshot for this month
    pennie_enrollment INTEGER,
    cms_idr_initiations INTEGER,
    pid_consumer_complaints INTEGER,
    pid_new_filings INTEGER,
    rate_filing_average_increase REAL,
    external_review_overturn_rate REAL,

    -- Counters for quick queries
    flags_raised_count INTEGER DEFAULT 0,
    action_items_count INTEGER DEFAULT 0,

    -- File reference
    report_filepath TEXT NOT NULL,
    provenance_hash TEXT CHECK(length(provenance_hash) = 64),

    -- Audit trail
    created_by TEXT DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_date_format CHECK(audit_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);

CREATE INDEX idx_audits_date ON audits(audit_date DESC);
CREATE INDEX idx_audits_status ON audits(overall_status);
CREATE INDEX idx_audits_complaints ON audits(pid_consumer_complaints DESC);

-- ----------------------------------------------------------------------------
-- PROVENANCE_ENTRIES TABLE - Cryptographic audit trail for all sources
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provenance_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    url TEXT NOT NULL,
    filepath TEXT NOT NULL,
    sha256_hash TEXT NOT NULL CHECK(length(sha256_hash) = 64),
    file_size_bytes INTEGER CHECK(file_size_bytes >= 0),
    tier TEXT NOT NULL CHECK(tier IN ('VERIFIED', 'UNVERIFIED', 'NOT_FOUND')),
    accessible BOOLEAN NOT NULL DEFAULT 1,
    http_status INTEGER,
    notes TEXT,
    recorded_at_utc TEXT NOT NULL DEFAULT (datetime('now')),
    signature TEXT NOT NULL,
    created_by TEXT DEFAULT 'system',
    UNIQUE(url, recorded_at_utc)
);

CREATE INDEX idx_provenance_url ON provenance_entries(url);
CREATE INDEX idx_provenance_tier ON provenance_entries(tier);
CREATE INDEX idx_provenance_timestamp ON provenance_entries(recorded_at_utc);
CREATE INDEX idx_provenance_hash ON provenance_entries(sha256_hash);

-- ----------------------------------------------------------------------------
-- CITATIONS_TABLE - Registry of verified and failed citations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citation_identifier TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('VERIFIED', 'FAILED', 'NOT_FOUND', 'PENDING')),
    subject TEXT,
    effective_date TEXT,
    source_urls TEXT, -- JSON array as text
    verification_tier TEXT CHECK(verification_tier IN ('VERIFIED', 'UNVERIFIED', 'NOT_FOUND')),
    last_verified_at TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_citations_status ON citations(status);
CREATE INDEX idx_citations_tier ON citations(verification_tier);

-- Initial data for verified citations
INSERT OR IGNORE INTO citations (citation_identifier, display_name, status, subject, effective_date, verification_tier) VALUES
    ('act_146_2022', 'Act 146 of 2022 (SB 225)', 'VERIFIED', 'Prior authorization standards; external review', '2024-01-01', 'VERIFIED'),
    ('article_xxi', 'Article XXI, Insurance Company Law of 1921', 'VERIFIED', 'Managed care accountability and disclosure', NULL, 'VERIFIED'),
    ('no_surprises_act', 'No Surprises Act (CAA 2021)', 'VERIFIED', 'Surprise billing protections', '2022-01-01', 'VERIFIED');

-- Initial data for failed citations
INSERT OR IGNORE INTO citations (citation_identifier, display_name, status, subject, notes, verification_tier) VALUES
    ('sb_1071_2024', 'SB 1071 (2023-24)', 'FAILED', 'University of Pennsylvania appropriation', 'Not health insurance legislation', 'NOT_FOUND'),
    ('act_252_2023', 'Act 252-2023', 'FAILED', 'Network disclosure requirements', 'Does not exist; only 19 bills enacted in 2023', 'NOT_FOUND'),
    ('sec_28_725', 'Pennsylvania Insurance Code § 28-725', 'FAILED', 'Managed care disclosure', 'Wrong citation format; use Article XXI', 'NOT_FOUND'),
    ('sec_29_8719', 'Pennsylvania Insurance Code § 29-8719', 'FAILED', 'Managed care disclosure', 'Wrong citation format; use Article XXI', 'NOT_FOUND'),
    ('bulletin_23_04', 'Bulletin #23-04', 'FAILED', 'Balance billing enforcement', 'Medicare Supplement guaranteed issue only', 'NOT_FOUND');

-- ----------------------------------------------------------------------------
-- ALERTS TABLE - Notification history and escalation records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL CHECK(alert_type IN ('INFO', 'WARNING', 'CRITICAL')),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT 0,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMP,
    resolution TEXT,
    resolved_at TIMESTAMP,
    metric_name TEXT,
    threshold_exceeded REAL,
    actual_value REAL,
    notification_channels TEXT, -- JSON array: ['slack', 'email']
    metadata TEXT -- JSON blob for additional context
);

CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);

-- ----------------------------------------------------------------------------
-- SYSTEM_LOGS TABLE - Application logs with PII redaction
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    level TEXT NOT NULL CHECK(level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    logger_name TEXT,
    message TEXT NOT NULL,
    module TEXT,
    function_name TEXT,
    line_number INTEGER,
    exception_type TEXT,
    exception_message TEXT,
    user_id TEXT,
    session_id TEXT,
    ip_address TEXT,
    pii_redacted BOOLEAN DEFAULT 1
);

CREATE INDEX idx_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_logs_level ON system_logs(level);
CREATE INDEX idx_logs_logger ON system_logs(logger_name);

-- ----------------------------------------------------------------------------
-- RATE_LIMITS TABLE - API rate limiting state (for future scaling)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL, -- IP or user ID
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_window ON rate_limits(window_end);

-- ----------------------------------------------------------------------------
-- METRICS_HISTORY TABLE - Time series for Prometheus-compatible data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    labels TEXT -- JSON blob for label key-value pairs
);

CREATE INDEX idx_metrics_name_time ON metrics_history(metric_name, collected_at DESC);

-- ----------------------------------------------------------------------------
-- JOB_RUNS TABLE - Track automated pipeline executions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status TEXT NOT NULL CHECK(status IN ('RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED')),
    error_message TEXT,
    triggered_by TEXT DEFAULT 'scheduled',
    output_artifacts TEXT, -- JSON array of file paths
    duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE WHEN completed_at IS NOT NULL
        THEN CAST((julianday(completed_at) - julianday(started_at)) * 86400 AS INTEGER)
        ELSE NULL END
    ) STORED
);

CREATE INDEX idx_job_runs_status ON job_runs(status);
CREATE INDEX idx_job_runs_started ON job_runs(started_at DESC);
CREATE INDEX idx_job_runs_name ON job_runs(job_name);

-- ----------------------------------------------------------------------------
-- TRIGGER: Update updated_at on audit record modification
-- ----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_audits_updated_at
AFTER UPDATE ON audits
BEGIN
    UPDATE audits SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ----------------------------------------------------------------------------
-- TRIGGER: Log alert creation
-- ----------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_alert_created
AFTER INSERT ON alerts
WHEN NEW.triggered_at IS CURRENT_TIMESTAMP
BEGIN
    INSERT INTO system_logs (level, logger_name, message)
    VALUES ('WARNING', 'alerts', 'Alert triggered: ' || NEW.alert_type || ' - ' || NEW.metric_name);
END;

-- ----------------------------------------------------------------------------
-- VIEW: Current month audit summary
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_current_audit AS
SELECT * FROM audits
WHERE audit_date = (SELECT MAX(audit_date) FROM audits);

-- ----------------------------------------------------------------------------
-- VIEW: Citation status summary
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_citations_summary AS
SELECT
    status,
    verification_tier,
    COUNT(*) as count
FROM citations
GROUP BY status, verification_tier;

-- ----------------------------------------------------------------------------
-- VIEW: Alert statistics by type
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_alert_statistics AS
SELECT
    alert_type,
    COUNT(*) as total_alerts,
    SUM(CASE WHEN acknowledged THEN 1 ELSE 0 END) as acknowledged_count,
    AVG(julianday(resolved_at) - julianday(triggered_at)) * 24 as avg_hours_to_resolve
FROM alerts
GROUP BY alert_type;

-- ----------------------------------------------------------------------------
-- TRUNCATE ALL DATA (FOR TESTING ONLY - DO NOT RUN IN PRODUCTION)
-- ----------------------------------------------------------------------------
-- Uncomment these lines when needed:
-- DELETE FROM audits;
-- DELETE FROM provenance_entries;
-- DELETE FROM alerts;
-- DELETE FROM system_logs;
-- DELETE FROM metrics_history;
-- DELETE FROM job_runs;
-- DELETE FROM rate_limits;

-- ----------------------------------------------------------------------------
-- VACUUM AND OPTIMIZE
-- ----------------------------------------------------------------------------
VACUUM;
ANALYZE;
```

---

## 2. Docker Compose Manifest (`docker-compose.prod.yml`)

```yaml
version: "3.8"

# ============================================================================
# PA HEALTH INSURANCE AUDIT - PRODUCTION DEPLOYMENT
# ============================================================================
# Usage:
#   docker-compose -f docker-compose.prod.yml up -d
#   docker-compose -f docker-compose.prod.yml down
#   docker-compose -f docker-compose.prod.yml logs -f api
# ============================================================================

services:
  # --------------------------------------------------------------------------
  # API SERVICE - Flask application server
  # --------------------------------------------------------------------------
  api:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: pa_health_audit_api
    restart: unless-stopped

    ports:
      - "5000:5000"

    environment:
      - FLASK_APP=app.py
      - FLASK_ENV=production
      - PORT=5000
      - PA_HEALTH_AUDIT_DATA_ROOT=/app/data
      - PA_HEALTH_AUDIT_LOG_LEVEL=INFO
      - PA_HEALTH_AUDIT_SQLITE_DB_PATH=/app/data/audit.db
      - PA_HEALTH_AUDIT_REDIS_HOST=redis
      - PA_HEALTH_AUDIT_REDIS_PORT=6379
      - PA_HEALTH_AUDIT_JWT_SECRET=${JWT_SECRET}
      - PA_HEALTH_AUDIT_SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - PA_HEALTH_AUDIT_EMAIL_SMTP_HOST=${EMAIL_SMTP_HOST}
      - PA_HEALTH_AUDIT_EMAIL_SMTP_PORT=${EMAIL_SMTP_PORT:-587}
      - PA_HEALTH_AUDIT_EMAIL_FROM_ADDRESS=${EMAIL_FROM_ADDRESS}

    volumes:
      - audit_data:/app/data
      - audit_logs:/app/logs
      - ./config/.env:/app/.env:ro

    depends_on:
      redis:
        condition: service_healthy
      db:
        condition: service_healthy

    networks:
      - audit_network

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # --------------------------------------------------------------------------
  # WORKER SERVICE - Background audit pipeline runner
  # --------------------------------------------------------------------------
  worker:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: pa_health_audit_worker
    restart: unless-stopped

    command: >
      bash -c "
        python src/pipeline.py --run &&
        while true; do
          sleep 604800 &&  # Run weekly (7 days)
          python src/pipeline.py --run;
        done
      "

    environment:
      - PA_HEALTH_AUDIT_DATA_ROOT=/app/data
      - PA_HEALTH_AUDIT_LOG_LEVEL=INFO
      - PA_HEALTH_AUDIT_SQLITE_DB_PATH=/app/data/audit.db
      - PA_HEALTH_AUDIT_REDIS_HOST=redis

    volumes:
      - audit_data:/app/data
      - audit_logs:/app/logs
      - ./config/.env:/app/.env:ro

    depends_on:
      - redis
      - api

    networks:
      - audit_network

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # --------------------------------------------------------------------------
  # REDIS SERVICE - Caching & rate limiting backend
  # --------------------------------------------------------------------------
  redis:
    image: redis:7-alpine
    container_name: pa_health_audit_redis
    restart: unless-stopped

    ports:
      - "6379:6379"

    volumes:
      - redis_data:/data
      - ./config/redis.conf:/usr/local/etc/redis/redis.conf:ro

    command: redis-server /usr/local/etc/redis/redis.conf --appendonly yes

    networks:
      - audit_network

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # --------------------------------------------------------------------------
  # PROMETHEUS SERVICE - Metrics collection
  # --------------------------------------------------------------------------
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: pa_health_audit_prometheus
    restart: unless-stopped

    ports:
      - "9090:9090"

    volumes:
      - prometheus_data:/prometheus
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro

    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=90d'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

    networks:
      - audit_network

    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:9090/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3

  # --------------------------------------------------------------------------
  # GRAFANA SERVICE - Visualization dashboard
  # --------------------------------------------------------------------------
  grafana:
    image: grafana/grafana:10.2.0
    container_name: pa_health_audit_grafana
    restart: unless-stopped

    ports:
      - "3000:3000"

    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=${GRAFANA_ROOT_URL:-http://localhost:3000}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel

    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/etc/grafana/dashboards:ro

    depends_on:
      - prometheus

    networks:
      - audit_network

    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # --------------------------------------------------------------------------
  # NGINX REVERSE PROXY - SSL termination & load balancing
  # --------------------------------------------------------------------------
  nginx:
    image: nginx:alpine
    container_name: pa_health_audit_nginx
    restart: unless-stopped

    ports:
      - "80:80"
      - "443:443"

    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/nginx/ssl:/etc/nginx/ssl:ro

    depends_on:
      - api

    networks:
      - audit_network

    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # --------------------------------------------------------------------------
  # DATABASE BACKUP SERVICE - Scheduled PostgreSQL dumps (if migrating)
  # --------------------------------------------------------------------------
  backup:
    image: alpine:latest
    container_name: pa_health_audit_backup
    restart: unless-stopped

    command: >
      sh -c "
        while true; do
          find /backup -type f -mtime +30 -delete &&
          sqlite3 /data/audit.db '.backup \"/backup/audit_$(date +%Y%m%d_%H%M%S).db\"' &&
          sleep 86400;
        done
      "

    volumes:
      - audit_data:/data:ro
      - audit_backup:/backup

    depends_on:
      - api

    networks:
      - audit_network

# ============================================================================
# NETWORKS
# ============================================================================
networks:
  audit_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

# ============================================================================
# VOLUMES
# ============================================================================
volumes:
  audit_data:
    driver: local
    driver_opts:
      type: none
      device: ./data
      o: bind

  audit_logs:
    driver: local
    driver_opts:
      type: none
      device: ./logs
      o: bind

  redis_data:
    driver: local

  prometheus_data:
    driver: local

  grafana_data:
    driver: local

  audit_backup:
    driver: local
```

---

## 3. Requirements File (`requirements.txt`)

```txt
# ============================================================================
# PA HEALTH INSURANCE AUDIT - DEPENDENCY MANIFEST
# ============================================================================
# Generated: 2026-10-09
# Python Version: 3.11.0+ required
# Last Updated: 2026-10-09
# ============================================================================
# Installation: pip install -r requirements.txt
# Security Scan: pip-audit -r requirements.txt
# ============================================================================

# ============================================================================
# CORE ASYNC HTTP CLIENT
# ============================================================================
aiohttp==3.9.1
    # Async HTTP client/server for asyncio
    # https://docs.aiohttp.org/
aiohttp-socks==0.8.4
    # SOCKS proxy support for aiohttp
aiosignal==1.3.1
    # Frozen lists for signal handling
async-timeout==4.0.3
    # Timeout context manager for asyncio
frozenlist==1.4.0
    # Frozen list implementation
multidict==6.0.4
    # Multidict implementation for aiohttp
yarl==1.9.2
    # URL class for aiohttp

# ============================================================================
# RETRY & BACKOFF LOGIC
# ============================================================================
tenacity==8.2.3
    # Retry library with exponential backoff
    # Used in http_client.py circuit breaker
backoff==2.2.1
    # Decorator-based retry logic

# ============================================================================
# DATA PARSING & HTML EXTRACTION
# ============================================================================
pdfplumber==0.10.3
    # PDF text extraction with layout preservation
    # Critical for PID rate filing parsing
beautifulsoup4==4.12.2
    # HTML/XML parsing for web scraping
    # Used in DataParser class
lxml==4.9.3
    # Fast XML/HTML parser for beautifulsoup4
cssselect==1.2.0
    # CSS selector support for lxml

# ============================================================================
# VALIDATION & TYPE CHECKING
# ============================================================================
pydantic==2.5.2
    # Data validation using Python type hints
    # Core for AuditReport schema
pydantic-settings==2.1.0
    # Settings management for pydantic
pydantic-core==2.14.5
    # Core validation engine for pydantic
annotated-types==0.6.0
    # Type annotations for pydantic
typing-extensions==4.8.0
    # Backport of typing module features

# ============================================================================
# WEB FRAMEWORK & API
# ============================================================================
flask==3.0.0
    # Lightweight WSGI web framework
    # Main API layer
flask-limiter==3.5.0
    # Rate limiting for Flask routes
    # Prevents API abuse
flask-socketio==5.3.6
    # WebSocket support for live dashboard updates
flask-cors==4.0.0
    # Cross-Origin Resource Sharing support
Werkzeug==3.0.1
    # WSGI utilities for Flask
Jinja2==3.1.2
    # Template engine for Flask
MarkupSafe==2.1.3
    # Safe string escaping for Jinja2
itsdangerous==2.1.2
    # Secure data signing for Flask
click==8.1.7
    # Command line interface toolkit

# ============================================================================
# DATABASE & CACHING
# ============================================================================
sqlite-utils==3.36
    # CLI and Python API for SQLite databases
    # Used for migrations and querying
redis==5.0.1
    # Redis Python client
    # Caching layer for HTTP responses
hiredis==2.2.3
    # Fast Redis protocol parser
SQLAlchemy==2.0.23
    # ORM for SQLAlchemy if migrating to PostgreSQL

# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================
PyJWT==2.8.0
    # JSON Web Token implementation
    # API authentication
pyotp==2.9.0
    # One-time password generation
    # MFA support
cryptography==41.0.7
    # Cryptographic primitives
    # Password hashing, encryption
cffi==1.16.0
    # Foreign function interface for cryptography
pycparser==2.21
    # C parser for cffi

# ============================================================================
# TESTING & QUALITY ASSURANCE
# ============================================================================
pytest==7.4.3
    # Testing framework with fixtures
    # Run: pytest tests/ -v
pytest-asyncio==0.21.1
    # Async support for pytest
pytest-cov==4.1.0
    # Coverage reporting for pytest
coverage==7.3.2
    # Code coverage measurement
mock==5.1.0
    # Mock object replacement
hypothesis==6.92.1
    # Property-based testing
    # Edge case discovery

# ============================================================================
# MONITORING & OBSERVABILITY
# ============================================================================
prometheus-client==0.19.0
    # Prometheus metrics exporter
    # Exposes /metrics endpoint
psutil==5.9.6
    # System and process monitoring
    # CPU, memory, disk usage

# ============================================================================
# VISUALIZATION & FORECASTING
# ============================================================================
plotly==5.18.0
    # Interactive charting library
    # Dashboard visualizations
kaleido==0.2.1
    # Static export for plotly charts
pandas==2.1.3
    # Data manipulation for forecasting
numpy==1.26.2
    # Numerical computing library
scipy==1.11.4
    # Scientific computing
    # linregress for forecasting

# ============================================================================
# INFRASTRUCTURE & DEVOPS
# ============================================================================
docker==7.0.0
    # Docker SDK for Python
    # Programmatic container management
invoke==2.2.0
    # Task execution tool
    # Replacement for Makefile
gunicorn==21.2.0
    # WSGI HTTP server for production
gevent==23.9.1
    # Async event loop for gunicorn
greenlet==3.0.1
    # Lightweight coroutines for gevent

# ============================================================================
# LOGGING & TELEMETRY
# ============================================================================
python-json-logger==2.0.7
    # JSON structured logging
structlog==23.2.0
    # Structured logging with context
sentry-sdk==1.38.0
    # Error tracking and performance monitoring

# ============================================================================
# UTILITIES & HELPERS
# ============================================================================
python-dateutil==2.8.2
    # Date/time parsing and manipulation
requests==2.31.0
    # HTTP library for synchronous requests
urllib3==2.1.0
    # HTTP connection pooling
certifi==2023.11.17
    # SSL certificate bundle
charset-normalizer==3.3.2
    # Character encoding detection
idna==3.6
    # Internationalized domain names

# ============================================================================
# SCHEDULED TASKS
# ============================================================================
APScheduler==3.10.4
    # Task scheduling library
    # Weekly audit runs
schedule==1.2.1
    # Human-friendly scheduling
    # Simple cron-like syntax

# ============================================================================
# NOTIFICATIONS
# ============================================================================
slack-sdk==3.26.2
    # Slack SDK for webhooks
    # Alert notifications
twilio==8.11.0
    # SMS API (future use)
    # Emergency alerts

# ============================================================================
# EMAIL
# ============================================================================
sendgrid==6.11.0
    # Email delivery API
    # Weekly digest emails

# ============================================================================
# CLIMATE CONTROL (ENVIRONMENT CONFIGURATION)
# ============================================================================
python-dotenv==1.0.0
    # Environment variable management
    # .env file parsing

# ============================================================================
# OPTIONAL: PRODUCTION EXTRAS (Install separately for staging)
# ============================================================================
# pip install -r requirements-test.txt
# pip install -r requirements-dev.txt
```

---

## 4. Requirements Split Files

### `requirements-dev.txt` (Development Only)

```txt
-r requirements.txt

# Development tools
black==23.11.0              # Code formatting
flake8==6.1.0               # Linting
isort==5.12.0               # Import sorting
mypy==1.7.1                 # Static type checking
pre-commit==3.5.0           # Git hooks
pytest-xdist==3.5.0         # Parallel test execution
pytest-mock==3.12.0         # Mock plugin
tox==4.11.3                 # Test environment management

# Documentation
mkdocs==1.5.3               # Documentation site
mkdocs-material==9.4.8      # Material theme
pymdown-extensions==10.5.0  # Markdown extensions

# Debugging
ipdb==0.13.13               # IPython debugger
pdbpp==0.10.3               # Pretty-print debugger

# Profiling
line-profiler==4.1.1        # Line-by-line profiling
memory-profiler==0.61.0     # Memory usage profiling
```

### `requirements-test.txt` (CI/CD Testing)

```txt
-r requirements.txt

# CI/CD specific
pytest-cov==4.1.0
codecov==2.1.13
coverage[toml]==7.3.2
```

---

## 5. Quick Start Scripts

### `scripts/setup.sh` (Unix/Linux/macOS)

```bash
#!/bin/bash
# ============================================================================
# PA HEALTH INSURANCE AUDIT - QUICK SETUP SCRIPT
# ============================================================================
# Prerequisites: Python 3.11+, Docker 20.10+, git
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting PA Health Insurance Audit Setup..."

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+')
if [[ $(echo "$PYTHON_VERSION < 3.11" | bc -l) -eq 1 ]]; then
    echo "❌ Python 3.11+ required. Found: $PYTHON_VERSION"
    exit 1
fi
echo "✅ Python version: $PYTHON_VERSION"

# Clone repository
if [ ! -d ".git" ]; then
    echo "⚠️  Repository not initialized. Use: git clone <repo-url>"
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment template
if [ ! -f ".env" ]; then
    echo "⚙️  Setting up environment file..."
    cp .env.example .env
    echo "🔐 EDIT .env with your credentials before proceeding!"
    echo "   Required: JWT_SECRET, SLACK_WEBHOOK_URL, EMAIL_SMTP_*"
fi

# Initialize database
echo "💾 Initializing database..."
mkdir -p data logs
python -c "import sqlite3; conn=sqlite3.connect('data/audit.db'); exec(open('schema.sql').read()); conn.commit()"

# Run migrations
echo "🔄 Running database migrations..."
python -m src.migrations.run_migrations

# Start services (development mode)
read -p "Start development stack? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🏃 Starting services..."
    docker-compose -f docker-compose.dev.yml up -d
    echo "✅ Services started. Dashboard at http://localhost:3000"
    echo "   API at http://localhost:5000/api/health"
fi

# Verify installation
echo "🔍 Verifying installation..."
python -c "from schemas import AuditReport; print('✅ Schema validation OK')"
python -m pytest tests/ -v --tb=short -q

echo ""
echo "=================================================="
echo "🎉 Setup complete!"
echo "=================================================="
echo "Next steps:"
echo "1. Review .env file and update secrets"
echo "2. Run: docker-compose logs -f to monitor services"
echo "3. Test API: curl http://localhost:5000/api/health"
echo "4. Run first audit: python src/pipeline.py --run"
echo "=================================================="
```

### `scripts/quick-start.bat` (Windows PowerShell)

```powershell
# ============================================================================
# PA HEALTH INSURANCE AUDIT - WINDOWS QUICK START
# ============================================================================
# Prerequisites: Python 3.11+, Docker Desktop, Chocolatey (optional)
# Run: powershell -ExecutionPolicy Bypass -File scripts\quick-start.bat
# ============================================================================

Write-Host "🚀 Starting PA Health Insurance Audit Setup..." -ForegroundColor Cyan

# Check Python version
$pythonVersion = python --version 2>&1
Write-Host "Python version: $pythonVersion" -ForegroundColor Green

# Create virtual environment
Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment template
if (-not (Test-Path ".env")) {
    Write-Host "⚙️  Setting up environment file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "🔐 EDIT .env with your credentials before proceeding!" -ForegroundColor Red
}

# Initialize directories
New-Item -ItemType Directory -Force -Path data, logs | Out-Null

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🎉 Setup complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Review .env file and update secrets"
Write-Host "2. Start services: docker-compose -f docker-compose.dev.yml up -d"
Write-Host "3. Test API: curl http://localhost:5000/api/health"
Write-Host "4. Run first audit: python src/pipeline.py --run"
Write-Host "==================================================" -ForegroundColor Cyan
```

---

## 📋 INTEGRATION SUMMARY

With these files, your development team now has:

| Artifact | Purpose | Location | Status |
|----------|---------|----------|--------|
| **HANDOVER.json** | Complete system documentation | `/handover/HANDOVER.json` | ✅ Generated |
| **Master Backlog CSV** | Task tracking & sprint planning | `/backlog/master_backlog.csv` | ✅ Generated |
| **Schema SQL** | Database structure & migrations | `/src/schema.sql` | ✅ Generated |
| **Docker Compose** | Container orchestration | `/docker-compose.prod.yml` | ✅ Generated |
| **Requirements.txt** | Python dependencies | `/requirements.txt` | ✅ Generated |
| **Quick Start Scripts** | Automated environment setup | `/scripts/setup.sh` | ✅ Generated |

---

## 🎯 NEXT STEPS FOR FRESH SESSION

When you start the new chat, reference these exact artifacts:

1. **"Import this CSV into Jira"** → Provides task IDs for sprint planning
2. **"Deploy using this Docker Compose"** → Spin up production environment
3. **"Run this schema migration"** → Initialize database tables
4. **"Install dependencies from requirements.txt"** → Set up Python environment
5. **"Execute setup.sh"** → Automate first-time configuration
