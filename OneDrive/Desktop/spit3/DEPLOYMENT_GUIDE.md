# 🚀 ChainGuard Deployment Guide

## **Production Deployment Strategies**

---

## 📋 **Deployment Options**

### **1. Local Development**
- **Use Case**: Development and testing
- **Requirements**: Python 3.8+, Node.js 16+
- **Setup Time**: 5 minutes
- **Scalability**: Single user

### **2. Docker Containerization**
- **Use Case**: Consistent deployment across environments
- **Requirements**: Docker, Docker Compose
- **Setup Time**: 10 minutes
- **Scalability**: Medium

### **3. Cloud Deployment**
- **Use Case**: Production, high availability
- **Requirements**: Cloud provider account
- **Setup Time**: 30-60 minutes
- **Scalability**: High

### **4. Kubernetes**
- **Use Case**: Enterprise, microservices
- **Requirements**: Kubernetes cluster
- **Setup Time**: 2-4 hours
- **Scalability**: Very High

---

## 🐳 **Docker Deployment**

### **Docker Configuration**

#### **Backend Dockerfile**
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/status || exit 1

# Run application
CMD ["python", "api_server.py"]
```

#### **Frontend Dockerfile**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY chainguard-frontend/package*.json ./
RUN npm ci --only=production

COPY chainguard-frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **Docker Compose**
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - POLYGON_RPC_URL=${POLYGON_RPC_URL}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  logs:
```

### **Docker Deployment Commands**
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale backend
docker-compose up -d --scale backend=3

# Stop services
docker-compose down
```

---

## ☁️ **Cloud Deployment**

### **AWS Deployment**

#### **Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   Application    │    │   RDS/DynamoDB  │
│   (Frontend)    │    │   Load Balancer  │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        ▼                        │
         │              ┌──────────────────┐               │
         │              │   ECS/Fargate    │               │
         └──────────────►│   (Backend)      │◄──────────────┘
                        └──────────────────┘
```

#### **ECS Task Definition**
```json
{
  "family": "chainguard-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "chainguard-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/chainguard:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "FLASK_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/chainguard",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### **CloudFormation Template**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ChainGuard Infrastructure'

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true

  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: chainguard-cluster

  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Type: application
      Scheme: internet-facing
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2

  ECSService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 2
      LaunchType: FARGATE
```

### **Google Cloud Platform**

#### **Cloud Run Deployment**
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: chainguard-api
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 100
      containers:
      - image: gcr.io/PROJECT_ID/chainguard:latest
        ports:
        - containerPort: 5000
        env:
        - name: FLASK_ENV
          value: production
        resources:
          limits:
            cpu: 1000m
            memory: 2Gi
```

#### **Deployment Script**
```bash
#!/bin/bash

# Build and push to Container Registry
docker build -t gcr.io/$PROJECT_ID/chainguard:latest .
docker push gcr.io/$PROJECT_ID/chainguard:latest

# Deploy to Cloud Run
gcloud run deploy chainguard-api \
  --image gcr.io/$PROJECT_ID/chainguard:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10
```

### **Azure Deployment**

#### **Container Instances**
```yaml
apiVersion: 2019-12-01
location: eastus
name: chainguard-container-group
properties:
  containers:
  - name: chainguard-api
    properties:
      image: your-registry.azurecr.io/chainguard:latest
      resources:
        requests:
          cpu: 1
          memoryInGb: 2
      ports:
      - port: 5000
        protocol: TCP
  - name: chainguard-frontend
    properties:
      image: your-registry.azurecr.io/chainguard-frontend:latest
      resources:
        requests:
          cpu: 0.5
          memoryInGb: 1
      ports:
      - port: 80
        protocol: TCP
  osType: Linux
  ipAddress:
    type: Public
    ports:
    - protocol: tcp
      port: 80
    - protocol: tcp
      port: 5000
```

---

## ⚙️ **Kubernetes Deployment**

### **Kubernetes Manifests**

#### **Namespace**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: chainguard
```

#### **ConfigMap**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chainguard-config
  namespace: chainguard
data:
  FLASK_ENV: "production"
  POLYGON_RPC_URL: "https://polygon-rpc.com"
  MAX_TRANSACTIONS: "1000"
```

#### **Secret**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: chainguard-secrets
  namespace: chainguard
type: Opaque
data:
  API_SECRET_KEY: <base64-encoded-secret>
  DATABASE_URL: <base64-encoded-url>
```

#### **Backend Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chainguard-backend
  namespace: chainguard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chainguard-backend
  template:
    metadata:
      labels:
        app: chainguard-backend
    spec:
      containers:
      - name: api
        image: chainguard/backend:latest
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: chainguard-config
        - secretRef:
            name: chainguard-secrets
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /api/status
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/status
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### **Service**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: chainguard-backend-service
  namespace: chainguard
spec:
  selector:
    app: chainguard-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: ClusterIP
```

#### **Ingress**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chainguard-ingress
  namespace: chainguard
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.chainguard.com
    secretName: chainguard-tls
  rules:
  - host: api.chainguard.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chainguard-backend-service
            port:
              number: 80
```

### **Helm Chart**

#### **Chart.yaml**
```yaml
apiVersion: v2
name: chainguard
description: ChainGuard DeFi Fraud Detection System
type: application
version: 1.0.0
appVersion: "1.0.0"
```

#### **values.yaml**
```yaml
replicaCount: 3

image:
  repository: chainguard/backend
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.chainguard.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: chainguard-tls
      hosts:
        - api.chainguard.com

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### **Deployment Commands**
```bash
# Install with Helm
helm install chainguard ./helm-chart

# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n chainguard

# View logs
kubectl logs -f deployment/chainguard-backend -n chainguard
```

---

## 🔧 **Production Configuration**

### **Environment Variables**
```bash
# Production environment file
FLASK_ENV=production
DEBUG=False
SECRET_KEY=your-production-secret-key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/chainguard

# Blockchain
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY

# Redis
REDIS_URL=redis://redis:6379/0

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=INFO

# Security
CORS_ORIGINS=https://chainguard.com,https://app.chainguard.com
RATE_LIMIT=1000 per hour
```

### **Production Optimizations**

#### **Gunicorn Configuration**
```python
# gunicorn.conf.py
bind = "0.0.0.0:5000"
workers = 4
worker_class = "gevent"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
preload_app = True
```

#### **Nginx Configuration**
```nginx
upstream chainguard_backend {
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}

server {
    listen 80;
    server_name api.chainguard.com;
    
    location / {
        proxy_pass http://chainguard_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Static files
    location /static/ {
        alias /app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 📊 **Monitoring & Observability**

### **Health Checks**
```python
@app.route('/health')
def health_check():
    checks = {
        'database': check_database_connection(),
        'blockchain': check_blockchain_connection(),
        'model': check_model_loaded(),
        'memory': check_memory_usage()
    }
    
    status = 'healthy' if all(checks.values()) else 'unhealthy'
    return {'status': status, 'checks': checks}
```

### **Prometheus Metrics**
```python
from prometheus_client import Counter, Histogram, Gauge

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests')
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Active connections')
FRAUD_DETECTIONS = Counter('fraud_detections_total', 'Total fraud detections')
```

### **Logging Configuration**
```python
import logging
from pythonjsonlogger import jsonlogger

# JSON logging for production
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

---

## 🔒 **Security Hardening**

### **Container Security**
```dockerfile
# Use non-root user
RUN addgroup --system --gid 1001 chainguard
RUN adduser --system --uid 1001 chainguard
USER chainguard

# Remove unnecessary packages
RUN apt-get remove --purge -y \
    wget curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Set read-only filesystem
VOLUME ["/tmp"]
```

### **Network Security**
```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chainguard-network-policy
spec:
  podSelector:
    matchLabels:
      app: chainguard-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: chainguard-frontend
    ports:
    - protocol: TCP
      port: 5000
```

---

## 📈 **Scaling Strategies**

### **Horizontal Scaling**
- **Load Balancing**: Distribute requests across multiple instances
- **Auto Scaling**: Scale based on CPU/memory usage
- **Database Scaling**: Read replicas for query performance

### **Vertical Scaling**
- **Resource Optimization**: Increase CPU/memory per instance
- **Performance Tuning**: Optimize code and database queries
- **Caching**: Implement Redis for frequently accessed data

### **Microservices Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Auth Service   │    │   Frontend      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Transaction     │    │   ML Service     │    │   Notification  │
│ Service         │    │                  │    │   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

**Last Updated**: November 2024  
**Version**: 1.0.0