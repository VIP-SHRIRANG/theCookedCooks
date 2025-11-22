#!/usr/bin/env python3
"""
ChainGuard Launcher Script
"""

import subprocess
import sys
import os

def check_requirements():
    """Check if required packages are installed"""
    required_packages = [
        'streamlit', 'pandas', 'numpy', 'plotly', 
        'sklearn', 'joblib', 'catboost'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"  - {package}")
        print("\nPlease install them with:")
        print("pip install -r requirements.txt")
        return False
    
    return True

def check_model_files():
    """Check if model files exist"""
    required_files = ['best_model.pkl', 'X_final_columns.pkl']
    missing_files = []
    
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required model files:")
        for file in missing_files:
            print(f"  - {file}")
        return False
    
    return True

def main():
    print("🛡️ ChainGuard DeFi Fraud Monitoring Dashboard")
    print("=" * 50)
    
    # Check requirements
    print("Checking requirements...")
    if not check_requirements():
        sys.exit(1)
    
    # Check model files
    print("Checking model files...")
    if not check_model_files():
        sys.exit(1)
    
    print("✅ All checks passed!")
    print("\nStarting Streamlit application...")
    print("The dashboard will open in your browser automatically.")
    print("Press Ctrl+C to stop the application.")
    print("-" * 50)
    
    # Launch Streamlit
    try:
        subprocess.run([sys.executable, "-m", "streamlit", "run", "app.py"])
    except KeyboardInterrupt:
        print("\n\n👋 ChainGuard dashboard stopped.")
    except Exception as e:
        print(f"\n❌ Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()