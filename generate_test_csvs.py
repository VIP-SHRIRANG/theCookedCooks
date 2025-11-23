#!/usr/bin/env python3
"""
Generate Test CSV Files
Create smaller CSV files with the same structure as first_order_df.csv for testing
"""

import pandas as pd
import random
import time

def generate_test_csv(size, filename):
    """Generate a test CSV file with specified number of rows"""
    print(f"📊 Generating {filename} with {size} transactions...")
    
    # Base data from original file
    base_addresses = [
        "0x16f209b5332a1b4fa5bf19497ca40154c5db2f85",
        "0x002f0c8119c16d310342d869ca8bf6ace34d9c39", 
        "0xe7e07e44ee315b5f2d076340b2b7a5cc9a4ee57b",
        "0xe892875b87b94c44edf0e91ee9f49d0525fadd83",
        "0x0681d8db095565fe8a346fa0277bffde9c0edbbf",
        "0x97425ba35ffcbe298007684d8b8ecf0053895055",
        "0x0059b14e35dab1b4eee1e2926c7a5660da66f747",
        "0xd316b4460508e9a52c865c6bff1e4687891ed9a5",
        "0xc131bf91eb9dfac2468c775160062d619f5e2dc8",
        "0xe882c84a765af770b5778062eb9fea2417f5f09d"
    ]
    
    data = []
    base_timestamp = 1529873859
    base_block = 5848095
    
    for i in range(size):
        # Generate realistic transaction hash
        tx_hash = f"0x{''.join(random.choices('0123456789abcdef', k=64))}"
        
        # Increment block height and timestamp
        block_height = base_block + i * random.randint(1, 100)
        timestamp = base_timestamp + i * random.randint(10, 300)
        
        # Random addresses from base set
        from_addr = random.choice(base_addresses)
        to_addr = random.choice(base_addresses)
        
        # Make sure from and to are different
        while to_addr == from_addr:
            to_addr = random.choice(base_addresses)
        
        # Generate realistic values
        value_types = [
            lambda: round(random.uniform(0.001, 0.1), 8),      # Small transactions (70%)
            lambda: round(random.uniform(0.1, 1.0), 6),        # Medium transactions (20%)
            lambda: round(random.uniform(1.0, 10.0), 4),       # Large transactions (8%)
            lambda: round(random.uniform(10.0, 100.0), 2),     # Very large transactions (2%)
        ]
        
        weights = [0.7, 0.2, 0.08, 0.02]
        value_func = random.choices(value_types, weights=weights)[0]
        value = value_func()
        
        # Error rate: ~5% of transactions have errors
        is_error = 1 if random.random() < 0.05 else 0
        
        data.append({
            'Unnamed: 0': i,
            'TxHash': tx_hash,
            'BlockHeight': block_height,
            'TimeStamp': timestamp,
            'From': from_addr,
            'To': to_addr,
            'Value': value,
            'isError': is_error
        })
    
    # Create DataFrame and save
    df = pd.DataFrame(data)
    df.to_csv(filename, index=False)
    
    print(f"✅ Created {filename}")
    print(f"   Rows: {len(df)}")
    print(f"   Columns: {list(df.columns)}")
    print(f"   Error rate: {df['isError'].sum()}/{len(df)} ({df['isError'].mean()*100:.1f}%)")
    print(f"   Value range: {df['Value'].min():.6f} - {df['Value'].max():.6f} ETH")
    print()

def main():
    """Generate test CSV files of different sizes"""
    print("🛡️" + "=" * 60 + "🛡️")
    print("    ChainGuard Test CSV Generator")
    print("=" * 64)
    print()
    
    # Generate different sized test files
    test_files = [
        (10, "test_tiny_10.csv"),
        (50, "test_small_50.csv"), 
        (100, "test_medium_100.csv"),
        (500, "test_large_500.csv"),
        (1000, "test_xl_1000.csv")
    ]
    
    for size, filename in test_files:
        generate_test_csv(size, filename)
    
    print("=" * 64)
    print("🎉 All test CSV files generated successfully!")
    print()
    print("📋 Test Files Created:")
    for size, filename in test_files:
        print(f"   • {filename:<20} - {size:>4} transactions")
    
    print()
    print("🚀 Usage:")
    print("   1. Start ChainGuard: python api_server.py")
    print("   2. Start Frontend: cd chainguard-frontend && npm start")
    print("   3. Upload any test file via the CSV Analysis section")
    print("   4. Files process in <5 seconds vs 60+ for the full dataset")
    print()
    print("💡 Recommended testing order:")
    print("   • test_tiny_10.csv     - Quick functionality test")
    print("   • test_small_50.csv    - UI/UX testing")
    print("   • test_medium_100.csv  - Performance baseline")
    print("   • test_large_500.csv   - Stress test")
    print("   • test_xl_1000.csv     - Load test")
    print("=" * 64)

if __name__ == "__main__":
    main()