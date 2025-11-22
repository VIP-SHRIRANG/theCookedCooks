# 🚀 Render Deployment Guide for ChainGuard

## Quick Deployment Steps

### 1. **Prepare Your Repository**
```bash
# Make sure all files are committed
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. **Deploy on Render**

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `chainguard-app`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `streamlit run app.py --server.port=$PORT --server.address=0.0.0.0`

### 3. **Set Environment Variables**
In the Render dashboard, add these environment variables:

```
ALCHEMY_API_KEY=your_actual_alchemy_api_key
SECRET_KEY=your_flask_secret_key_here
API_SECRET_KEY=your_api_secret_key_here
FLASK_ENV=production
DEBUG=False
```

### 4. **Deploy**
Click "Create Web Service" and Render will automatically deploy your app!

## 🔧 Configuration Files Created

- `render.yaml` - Render service configuration
- Updated `requirements.txt` - All dependencies included
- Environment variables configured for production

## 📱 Access Your App

Once deployed, your app will be available at:
`https://your-app-name.onrender.com`

## 🔍 Monitoring

- **Logs**: Available in Render dashboard
- **Metrics**: CPU, memory usage in dashboard
- **Health checks**: Automatic with Streamlit

## 🚨 Important Notes

1. **Free Tier Limitations**:
   - Apps sleep after 15 minutes of inactivity
   - 750 hours/month limit
   - Cold starts may take 30+ seconds

2. **Environment Variables**:
   - Never commit `.env` file to GitHub
   - Set all secrets in Render dashboard
   - Use `.env.example` as reference

3. **Performance**:
   - Free tier has limited resources
   - Consider upgrading for production use
   - Monitor memory usage (512MB limit on free tier)

## 🔄 Auto-Deploy

Render automatically redeploys when you push to your main branch!

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main
# Render will automatically redeploy
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check `requirements.txt` for correct versions
   - Ensure Python 3.9+ compatibility

2. **App Won't Start**:
   - Verify start command is correct
   - Check environment variables are set

3. **Import Errors**:
   - Make sure all dependencies are in `requirements.txt`
   - Check for missing system packages

### Debug Commands:
```bash
# Test locally first
streamlit run app.py --server.port=8501

# Check requirements
pip install -r requirements.txt
```

## 📊 Render vs Other Platforms

| Platform | Free Tier | Auto-Deploy | Ease of Use |
|----------|-----------|-------------|-------------|
| Render | ✅ 750hrs | ✅ | ⭐⭐⭐⭐⭐ |
| Heroku | ❌ Paid only | ✅ | ⭐⭐⭐⭐ |
| Streamlit Cloud | ✅ Unlimited | ✅ | ⭐⭐⭐⭐⭐ |
| Railway | ✅ Limited | ✅ | ⭐⭐⭐⭐ |

**Render is perfect for your ChainGuard app!** 🎯