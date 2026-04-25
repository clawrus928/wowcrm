#!/bin/bash
# ═══════════════════════════════════════════════════
# Openclaw Tasks - EC2 Deploy Script
# ═══════════════════════════════════════════════════
#
# PREREQUISITES on your EC2:
#   sudo yum install -y docker        # Amazon Linux 2
#   sudo systemctl start docker
#   sudo systemctl enable docker
#   sudo usermod -aG docker $USER
#   # Log out and back in for group to take effect
#
# USAGE:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# ═══════════════════════════════════════════════════

set -e

APP_NAME="wowcrm"
PORT=3001

echo "🔨 Building Docker image..."
docker build -t $APP_NAME .

echo "🛑 Stopping old container (if exists)..."
docker rm -f $APP_NAME 2>/dev/null || true

echo "🚀 Starting new container..."
docker run -d \
  --name $APP_NAME \
  --restart unless-stopped \
  -p $PORT:80 \
  $APP_NAME

echo ""
echo "✅ Deployed successfully!"
echo "📍 Access at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_EC2_IP'):$PORT"
echo ""
echo "📋 Useful commands:"
echo "   docker logs $APP_NAME          # View logs"
echo "   docker restart $APP_NAME       # Restart"
echo "   docker stop $APP_NAME          # Stop"
echo ""
