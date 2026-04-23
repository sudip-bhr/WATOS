import pandas as pd
import numpy as np
from app.ml.synthetic_data import generate_synthetic_data
from app.ml.trainer import train_duration_model, train_delay_model
import os

def test_bootstrap():
    print("Testing ML Bootstrapping...")
    df = generate_synthetic_data(500)
    print("Data distribution for 'was_delayed':")
    print(df['was_delayed'].value_counts())
    
    results_dur = train_duration_model(df)
    print(f"Duration Model Metrics: {results_dur}")
    
    results_delay = train_delay_model(df)
    print(f"Delay Model Metrics: {results_delay}")
    print("Verification Successful!")

if __name__ == "__main__":
    test_bootstrap()
