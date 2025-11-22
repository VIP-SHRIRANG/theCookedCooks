#!/usr/bin/env python3
"""
ChainGuard Production Deployment Script
Sets up ChainGuard for production environment with monitoring, logging, and health checks
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path
from datetime import datetime

class ProductionDeployer:
    def __init__(self):
        self.project_dir = Path.cwd()
        self.log_dir = self.project_dir / "logs"
        self.config_dir = self.project_dir / "config"
        
    def setup_directories(self):
        """Create necessary directories for production"""
        print("📁 Setting up production directories...")
        
        directories = [
            self.log_dir,
            self.config_dir,
            self.project_dir / "exports",
            self.project_dir / "backups"
        ]
        
        for directory in directories:
            directory.mkdir(exist_ok=True)
            print(f"✅ Created: {directory}")
    
    def create_production_config(self):
        """Create production configuration files"""
        print("⚙️ Creating production configuration...")
        
        # Streamlit config
        streamlit_config = {
            "server": {
                "port": 8501,
                "headless": True,
                "enableCORS": False,
                "enableXsrfProtection": True
            },
            "browser": {
                "gatherUsageStats": False
            },
            "logger": {
                "level": "info"
            }
        }
        
        config_path = self.config_dir / "streamlit_config.toml"
        with open(config_path, 'w') as f:
            for section, settings in streamlit_config.items():
                f.write(f"[{section}]\n")
                for key, value in settings.items():
                    if isinstance(value, str):
                        f.write(f'{key} = "{value}"\n')
                    else:
                        f.write(f'{key} = {str(value).lower()}\n')
                f.write("\n")
        
        print(f"✅ Streamlit config: {config_path}")
        
        # Application config
        app_config = {
            "fraud_threshold": 0.5,
            "high_risk_threshold": 0.8,
            "max_history": 1000,
            "batch_size": 500,
            "auto_refresh_interval": 5,
            "log_level": "INFO",
            "enable_monitoring": True,
            "enable_alerts": True
        }
        
        app_config_path = self.config_dir / "app_config.json"
        with open(app_config_path, 'w') as f:
            json.dump(app_config, f, indent=2)
        
        print(f"✅ App config: {app_config_path}")
    
    def create_systemd_service(self):
        """Create systemd service file for Linux deployment"""
        print("🔧 Creating systemd service...")
        
        service_content = f"""[Unit]
Description=ChainGuard DeFi Fraud Detection System
After=network.target

[Service]
Type=simple
User=chainguard
WorkingDirectory={self.project_dir}
Environment=PATH={sys.executable}
ExecStart={sys.executable} -m streamlit run app.py --server.port=8501 --server.headless=true
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
        
        service_path = self.project_dir / "chainguard.service"
        with open(service_path, 'w') as f:
            f.write(service_content)
        
        print(f"✅ Systemd service: {service_path}")
        print("   To install: sudo cp chainguard.service /etc/systemd/system/")
        print("   To enable: sudo systemctl enable chainguard")
        print("   To start: sudo systemctl start chainguard")
    
    def create_docker_files(self):
        """Create Docker deployment files"""
        print("🐳 Creating Docker configuration...")
        
        # Dockerfile
        dockerfile_content = """FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create non-root user
RUN useradd -m -u 1000 chainguard && chown -R chainguard:chainguard /app
USER chainguard

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Run application
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
"""
        
        dockerfile_path = self.project_dir / "Dockerfile"
        with open(dockerfile_path, 'w') as f:
            f.write(dockerfile_content)
        
        print(f"✅ Dockerfile: {dockerfile_path}")
        
        # Docker Compose
        compose_content = """version: '3.8'

services:
  chainguard:
    build: .
    ports:
      - "8501:8501"
    volumes:
      - ./logs:/app/logs
      - ./exports:/app/exports
      - ./config:/app/config
    environment:
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8501/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - chainguard
    restart: unless-stopped
"""
        
        compose_path = self.project_dir / "docker-compose.yml"
        with open(compose_path, 'w') as f:
            f.write(compose_content)
        
        print(f"✅ Docker Compose: {compose_path}")
    
    def create_nginx_config(self):
        """Create Nginx reverse proxy configuration"""
        print("🌐 Creating Nginx configuration...")
        
        nginx_content = """events {
    worker_connections 1024;
}

http {
    upstream chainguard {
        server chainguard:8501;
    }

    server {
        listen 80;
        server_name _;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Proxy Configuration
        location / {
            proxy_pass http://chainguard;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Static files caching
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
"""
        
        nginx_path = self.project_dir / "nginx.conf"
        with open(nginx_path, 'w') as f:
            f.write(nginx_content)
        
        print(f"✅ Nginx config: {nginx_path}")
    
    def create_monitoring_scripts(self):
        """Create monitoring and health check scripts"""
        print("📊 Creating monitoring scripts...")
        
        # Health check script
        health_check_content = """#!/bin/bash
# ChainGuard Health Check Script

HEALTH_URL="http://localhost:8501/_stcore/health"
LOG_FILE="logs/health_check.log"

# Create log directory if it doesn't exist
mkdir -p logs

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check Streamlit health
if curl -f -s "$HEALTH_URL" > /dev/null; then
    log_message "✅ ChainGuard is healthy"
    exit 0
else
    log_message "❌ ChainGuard health check failed"
    exit 1
fi
"""
        
        health_check_path = self.project_dir / "health_check.sh"
        with open(health_check_path, 'w') as f:
            f.write(health_check_content)
        
        os.chmod(health_check_path, 0o755)
        print(f"✅ Health check script: {health_check_path}")
        
        # Backup script
        backup_content = """#!/bin/bash
# ChainGuard Backup Script

BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="chainguard_backup_$DATE.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \\
    --exclude="logs/*" \\
    --exclude="backups/*" \\
    --exclude="__pycache__" \\
    --exclude="*.pyc" \\
    .

echo "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE"

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t chainguard_backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "✅ Old backups cleaned up"
"""
        
        backup_path = self.project_dir / "backup.sh"
        with open(backup_path, 'w') as f:
            f.write(backup_content)
        
        os.chmod(backup_path, 0o755)
        print(f"✅ Backup script: {backup_path}")
    
    def create_deployment_guide(self):
        """Create deployment guide"""
        print("📖 Creating deployment guide...")
        
        guide_content = """# ChainGuard Production Deployment Guide

## Quick Deployment Options

### Option 1: Docker Deployment (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f chainguard
```

### Option 2: Systemd Service (Linux)
```bash
# Copy service file
sudo cp chainguard.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable chainguard
sudo systemctl start chainguard

# Check status
sudo systemctl status chainguard
```

### Option 3: Manual Deployment
```bash
# Install dependencies
pip install -r requirements.txt

# Run with production config
streamlit run app.py --server.port=8501 --server.headless=true
```

## Production Configuration

### Environment Variables
- `CHAINGUARD_LOG_LEVEL`: Set logging level (INFO, DEBUG, WARNING, ERROR)
- `CHAINGUARD_PORT`: Set application port (default: 8501)
- `CHAINGUARD_HOST`: Set host address (default: 0.0.0.0)

### SSL/TLS Setup
1. Obtain SSL certificates
2. Place certificates in `ssl/` directory
3. Update nginx.conf with certificate paths
4. Restart nginx service

### Monitoring Setup
```bash
# Add to crontab for health checks
*/5 * * * * /path/to/chainguard/health_check.sh

# Add to crontab for daily backups
0 2 * * * /path/to/chainguard/backup.sh
```

## Security Considerations

1. **Firewall Configuration**
   - Allow only necessary ports (80, 443, 8501)
   - Block direct access to application port in production

2. **User Permissions**
   - Run application as non-root user
   - Set appropriate file permissions

3. **Network Security**
   - Use HTTPS in production
   - Configure proper CORS settings
   - Enable security headers

## Performance Tuning

1. **Resource Allocation**
   - Minimum 2GB RAM recommended
   - 2+ CPU cores for optimal performance
   - SSD storage for better I/O

2. **Application Tuning**
   - Adjust batch_size in config for your hardware
   - Configure max_history based on memory availability
   - Set appropriate refresh intervals

## Troubleshooting

### Common Issues
1. **Port Already in Use**
   ```bash
   sudo lsof -i :8501
   sudo kill -9 <PID>
   ```

2. **Permission Denied**
   ```bash
   sudo chown -R chainguard:chainguard /path/to/chainguard
   chmod +x *.sh
   ```

3. **Model Loading Errors**
   - Verify all model files are present
   - Check file permissions
   - Ensure dependencies are installed

### Log Locations
- Application logs: `logs/chainguard.log`
- Health check logs: `logs/health_check.log`
- System logs: `/var/log/syslog` (systemd)
- Docker logs: `docker-compose logs chainguard`

## Maintenance

### Regular Tasks
- Monitor disk space in logs/ directory
- Review and rotate log files
- Update dependencies regularly
- Test backup and restore procedures

### Updates
```bash
# Stop service
sudo systemctl stop chainguard  # or docker-compose down

# Backup current version
./backup.sh

# Update code
git pull  # or copy new files

# Restart service
sudo systemctl start chainguard  # or docker-compose up -d
```
"""
        
        guide_path = self.project_dir / "DEPLOYMENT.md"
        with open(guide_path, 'w') as f:
            f.write(guide_content)
        
        print(f"✅ Deployment guide: {guide_path}")
    
    def deploy(self):
        """Run complete production deployment setup"""
        print("🚀 ChainGuard Production Deployment")
        print("=" * 50)
        
        try:
            self.setup_directories()
            self.create_production_config()
            self.create_systemd_service()
            self.create_docker_files()
            self.create_nginx_config()
            self.create_monitoring_scripts()
            self.create_deployment_guide()
            
            print("\n✅ Production deployment setup complete!")
            print("\nNext steps:")
            print("1. Review configuration files in config/")
            print("2. Choose deployment method (Docker recommended)")
            print("3. Set up SSL certificates for HTTPS")
            print("4. Configure monitoring and backups")
            print("5. Read DEPLOYMENT.md for detailed instructions")
            
        except Exception as e:
            print(f"❌ Deployment setup failed: {e}")
            return False
        
        return True

def main():
    """Main deployment function"""
    deployer = ProductionDeployer()
    
    print("🛡️ ChainGuard Production Deployment Setup")
    print("This will create production configuration files and deployment scripts.")
    
    confirm = input("\nProceed with production setup? (y/N): ").strip().lower()
    
    if confirm == 'y':
        deployer.deploy()
    else:
        print("Deployment setup cancelled.")

if __name__ == "__main__":
    main()