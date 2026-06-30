#!/usr/bin/env bash
# deploy.sh — Run this on a fresh Ubuntu 22.04 EC2 instance to set up the app.
# Usage: bash deploy.sh
set -euo pipefail

echo "=== Geopolitical Dashboard — EC2 Setup Script ==="

# ── 1. System packages ─────────────────────────────────────────────────────────
echo "[1/6] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq git curl unzip docker.io docker-compose-v2

# Start Docker and enable on boot
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"

# ── 2. Clone / pull the repository ────────────────────────────────────────────
REPO_DIR="$HOME/geopolitical-dashboard"

if [ -d "$REPO_DIR/.git" ]; then
  echo "[2/6] Pulling latest changes..."
  git -C "$REPO_DIR" pull
else
  echo "[2/6] Cloning repository..."
  # Replace the URL below with your actual GitHub/GitLab repo URL
  git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git "$REPO_DIR"
fi

cd "$REPO_DIR"

# ── 3. Create production .env if it doesn't exist ─────────────────────────────
echo "[3/6] Checking environment config..."
ENV_FILE="server/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "  Creating $ENV_FILE — edit this file with your real values before continuing."
  cat > "$ENV_FILE" <<'EOF'
NODE_ENV=production
SERVER_PORT=5050
DB_SERVER=mssql
DB_DATABASE=geopolitical_dashboard
DB_USER=sa
DB_PASSWORD=YourPassword123!
DB_PORT=1433
DB_CONNECT_STRICT=false
DB_INIT_ENABLED=true
AUTH_REQUIRED=false
ALLOWED_ORIGINS=*
EOF
  echo "  ⚠  Edit server/.env now, then re-run this script."
  exit 1
fi

# ── 4. Build and start with Docker Compose ────────────────────────────────────
echo "[4/6] Building Docker images (this takes a few minutes first time)..."
sudo docker compose --profile production build

echo "[5/6] Starting services..."
sudo docker compose --profile production up -d

# ── 5. Wait for health check ──────────────────────────────────────────────────
echo "[6/6] Waiting for app to become healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    PUBLIC_IP=$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4 || echo "<your-ec2-ip>")
    PUBLIC_DNS=$(curl -sf http://169.254.169.254/latest/meta-data/public-hostname || echo "<your-ec2-dns>")
    echo "   App URL:  http://$PUBLIC_DNS"
    echo "   Alt URL:  http://$PUBLIC_IP"
    echo ""
    exit 0
  fi
  printf "."
  sleep 5
done

echo ""
echo "⚠  App did not respond in time. Check logs with:"
echo "   sudo docker compose --profile production logs app"
exit 1
