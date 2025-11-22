#!/usr/bin/env python3
"""
ChainGuard Production Launcher
Complete setup and launch script for the real-time fraud monitoring system
"""

import subprocess
import sys
import os
import time
import threading
from pathlib import Path

def install_requirements():
    """Install all required packages"""
    requirements = [
        "streamlit>=1.28.0",
        "pandas>=1.5.0", 
        "numpy>=1.24.0",
        "plotly>=5.15.0",
        "scikit-learn>=1.3.0",
        "joblib>=1.3.0",
        "catboost>=1.2.0",
        "web3>=7.0.0",
        "matplotlib>=3.7.0"
    ]
    
    print("🔧 Installing required packages...")
    for req in requirements:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", req], 
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"✅ {req}")
        except subprocess.CalledProcessError:
            print(f"❌ Failed to install {req}")
            return False
    
    return True

def check_model_files():
    """Check if required model files exist"""
    required_files = [
        'best_model.pkl',
        'X_final_columns.pkl', 
        'spit2.py',
        'backend.py',
        'app.py'
    ]
    
    print("📁 Checking required files...")
    missing_files = []
    
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
            print(f"❌ Missing: {file}")
        else:
            print(f"✅ Found: {file}")
    
    if missing_files:
        print(f"\n❌ Missing required files: {missing_files}")
        return False
    
    return True

def test_model_loading():
    """Test if the model can be loaded successfully"""
    try:
        print("🧪 Testing model loading...")
        import backend
        model, columns = backend.load_model_and_columns()
        
        if model is None or columns is None:
            print("❌ Failed to load model or columns")
            return False
        
        print(f"✅ Model loaded: {type(model).__name__}")
        print(f"✅ Features: {len(columns)} columns")
        return True
        
    except Exception as e:
        print(f"❌ Model loading error: {e}")
        return False

def launch_streamlit():
    """Launch the Streamlit application"""
    print("🚀 Launching ChainGuard Dashboard...")
    print("📱 The application will open in your browser automatically")
    print("🛑 Press Ctrl+C to stop the application")
    print("-" * 60)
    
    try:
        subprocess.run([sys.executable, "-m", "streamlit", "run", "app.py", 
                       "--server.headless", "false",
                       "--server.port", "8501",
                       "--browser.gatherUsageStats", "false"])
    except KeyboardInterrupt:
        print("\n👋 ChainGuard stopped by user")
    except Exception as e:
        print(f"❌ Error launching Streamlit: {e}")

def launch_terminal_monitor():
    """Launch the terminal-based real-time monitor"""
    print("🚀 Launching Terminal Monitor...")
    print("🛑 Press Ctrl+C to stop monitoring")
    print("-" * 60)
    
    try:
        subprocess.run([sys.executable, "realtime_fraud_monitor.py"])
    except KeyboardInterrupt:
        print("\n👋 Monitor stopped by user")
    except Exception as e:
        print(f"❌ Error launching monitor: {e}")

def show_menu():
    """Show the main menu"""
    print("\n🛡️ ChainGuard - Real-Time DeFi Fraud Detection System")
    print("=" * 60)
    print("1. 🌐 Launch Web Dashboard (Streamlit)")
    print("2. 💻 Launch Terminal Monitor")
    print("3. 🧪 Test System Components")
    print("4. 📦 Install/Update Dependencies")
    print("5. ❌ Exit")
    print("-" * 60)
    
    choice = input("Select option (1-5): ").strip()
    return choice

def test_system():
    """Run comprehensive system tests"""
    print("\n🧪 Running System Tests...")
    print("=" * 40)
    
    # Test 1: File check
    if not check_model_files():
        return False
    
    # Test 2: Model loading
    if not test_model_loading():
        return False
    
    # Test 3: Backend functionality
    try:
        print("🧪 Testing backend functionality...")
        import backend
        
        # Test sample transaction
        sample_data = backend.create_sample_transaction()
        df_sample = __import__('pandas').DataFrame([sample_data])
        result = backend.predict_with_risk(df_sample)
        
        print(f"✅ Sample prediction: Risk Score {result['risk_score'].iloc[0]}")
        
    except Exception as e:
        print(f"❌ Backend test failed: {e}")
        return False
    
    # Test 4: Web3 connection (optional)
    try:
        print("🧪 Testing blockchain connection...")
        from web3 import Web3
        
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        ALCHEMY_API_KEY = os.getenv('ALCHEMY_API_KEY')
        if not ALCHEMY_API_KEY:
            raise ValueError("ALCHEMY_API_KEY environment variable is required")
            
        ALCHEMY_URL = f"wss://polygon-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
        w3 = Web3(Web3.LegacyWebSocketProvider(ALCHEMY_URL))
        
        if w3.is_connected():
            latest_block = w3.eth.block_number
            print(f"✅ Blockchain connected: Block {latest_block}")
        else:
            print("⚠️ Blockchain connection failed (check API key)")
            
    except Exception as e:
        print(f"⚠️ Blockchain test failed: {e}")
    
    print("\n✅ System tests completed!")
    return True

def main():
    """Main launcher function"""
    print("🛡️ ChainGuard Production Launcher")
    print("Initializing fraud detection system...")
    
    # Initial setup
    if not Path("app.py").exists():
        print("❌ ChainGuard files not found in current directory")
        print("Please run this script from the ChainGuard project directory")
        return
    
    while True:
        choice = show_menu()
        
        if choice == "1":
            # Launch web dashboard
            if check_model_files() and test_model_loading():
                launch_streamlit()
            else:
                print("❌ System check failed. Please fix issues before launching.")
                input("Press Enter to continue...")
        
        elif choice == "2":
            # Launch terminal monitor
            if check_model_files() and test_model_loading():
                launch_terminal_monitor()
            else:
                print("❌ System check failed. Please fix issues before launching.")
                input("Press Enter to continue...")
        
        elif choice == "3":
            # Test system
            test_system()
            input("Press Enter to continue...")
        
        elif choice == "4":
            # Install dependencies
            if install_requirements():
                print("✅ All dependencies installed successfully!")
            else:
                print("❌ Some dependencies failed to install")
            input("Press Enter to continue...")
        
        elif choice == "5":
            # Exit
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please select 1-5.")
            time.sleep(1)

if __name__ == "__main__":
    main()