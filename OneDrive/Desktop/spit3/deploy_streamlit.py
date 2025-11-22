#!/usr/bin/env python3
"""
Quick deployment script for ChainGuard to Streamlit Cloud
"""

import os
import subprocess
import sys

def check_requirements():
    """Check if all requirements are met"""
    print("🔍 Checking deployment requirements...")
    
    # Check if .env exists
    if not os.path.exists('.env'):
        print("❌ .env file not found!")
        print("📝 Create .env file with your API keys first")
        return False
    
    # Check if git is initialized
    try:
        subprocess.run(['git', 'status'], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("❌ Git repository not initialized!")
        print("📝 Run: git init")
        return False
    
    print("✅ Requirements check passed!")
    return True

def prepare_for_deployment():
    """Prepare repository for deployment"""
    print("🛠️  Preparing for deployment...")
    
    # Create secrets.toml for Streamlit Cloud
    secrets_content = """
# Streamlit secrets file
# This will be configured in Streamlit Cloud dashboard

[secrets]
ALCHEMY_API_KEY = "your_alchemy_api_key_here"
SECRET_KEY = "your_flask_secret_key_here"
API_SECRET_KEY = "your_api_secret_key_here"
"""
    
    os.makedirs('.streamlit', exist_ok=True)
    with open('.streamlit/secrets.toml', 'w') as f:
        f.write(secrets_content)
    
    # Create config.toml for Streamlit
    config_content = """
[server]
headless = true
port = $PORT
enableCORS = false

[theme]
primaryColor = "#FF6B6B"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#262730"
"""
    
    with open('.streamlit/config.toml', 'w') as f:
        f.write(config_content)
    
    print("✅ Streamlit configuration created!")

def create_dockerfile():
    """Create Dockerfile for containerized deployment"""
    dockerfile_content = """
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Run Streamlit app
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
"""
    
    with open('Dockerfile', 'w') as f:
        f.write(dockerfile_content)
    
    print("✅ Dockerfile created!")

def create_docker_compose():
    """Create docker-compose.yml for local testing"""
    compose_content = """
version: '3.8'

services:
  chainguard:
    build: .
    ports:
      - "8501:8501"
    environment:
      - ALCHEMY_API_KEY=${ALCHEMY_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
      - API_SECRET_KEY=${API_SECRET_KEY}
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8501/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
"""
    
    with open('docker-compose.yml', 'w') as f:
        f.write(compose_content)
    
    print("✅ Docker Compose configuration created!")

def show_deployment_instructions():
    """Show deployment instructions"""
    print("\n🚀 **DEPLOYMENT INSTRUCTIONS**\n")
    
    print("**Option 1: Streamlit Cloud (Easiest)**")
    print("1. Push your code to GitHub:")
    print("   git add .")
    print("   git commit -m 'Ready for deployment'")
    print("   git push origin main")
    print("\n2. Go to https://share.streamlit.io")
    print("3. Connect your GitHub repository")
    print("4. Set main file as 'app.py'")
    print("5. Add your secrets in the Streamlit dashboard")
    print("   - ALCHEMY_API_KEY")
    print("   - SECRET_KEY")
    print("   - API_SECRET_KEY")
    
    print("\n**Option 2: Docker (Local/Cloud)**")
    print("1. Test locally:")
    print("   docker-compose up")
    print("\n2. Deploy to cloud:")
    print("   - Railway: railway login && railway up")
    print("   - Heroku: heroku container:push web && heroku container:release web")
    print("   - Google Cloud Run: gcloud run deploy")
    
    print("\n**Option 3: Traditional Hosting**")
    print("1. Install dependencies on server:")
    print("   pip install -r requirements.txt")
    print("\n2. Set environment variables")
    print("3. Run with:")
    print("   streamlit run app.py --server.port=8501")

def main():
    """Main deployment preparation function"""
    print("🎯 ChainGuard Deployment Preparation")
    print("=" * 40)
    
    if not check_requirements():
        sys.exit(1)
    
    prepare_for_deployment()
    create_dockerfile()
    create_docker_compose()
    show_deployment_instructions()
    
    print("\n✅ **Deployment preparation complete!**")
    print("📚 Check DEPLOYMENT_GUIDE.md for detailed instructions")

if __name__ == "__main__":
    main()