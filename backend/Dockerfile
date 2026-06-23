# -----------------------------------------------------------------------------
# Stage 1: Build dependencies
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install dependencies globally in the builder stage
RUN pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# Stage 2: Production runner
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS runner

# Create a system user and group for running the application securely
RUN groupadd -g 10001 appgroup && \
    useradd -r -u 10001 -g appgroup appuser

WORKDIR /app

# Install runtime dependencies and curl for the health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-installed site-packages and binaries from builder stage
COPY --from=builder /usr/local /usr/local
# Copy project files and ensure they are owned by the non-root appuser
COPY --chown=appuser:appgroup . .

# Set environment paths and python configurations
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose API port
EXPOSE 8000

# Switch execution to the non-root user
USER appuser

# Health check to monitor application and database status
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
