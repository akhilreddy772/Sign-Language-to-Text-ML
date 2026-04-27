import pandas as pd
import numpy as np
import os
import sys
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder, StandardScaler

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data.csv")
MODEL_PKL = os.path.join(BASE_DIR, "model.pkl")

def train():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found. Please collect some data first.")
        return False

    print(f"Loading data from {CSV_PATH}...")
    try:
        df = pd.read_csv(CSV_PATH)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return False
    
    # 1. Cleaning
    df = df.dropna()
    df['label'] = df['label'].str.lower().str.strip()
    df = df.drop_duplicates()

    if len(df) < 10:
        print(f"Error: Insufficient data ({len(df)} samples). Need at least 10.")
        return False

    print("\nInitial Label Distribution:")
    print(df['label'].value_counts())

    # 2. Validation & Split
    X = df.drop('label', axis=1).astype(float).values
    y = df['label'].values
    
    expected_features = 63
    if X.shape[1] != expected_features:
        print(f"ERROR: Expected {expected_features} features, but CSV has {X.shape[1]}. Check processor.py extraction.")
        return False

    # 3. Augmentation & Balancing
    # Synthesize missing/low-count classes to at least 200 samples
    required_classes = ['hello', 'good', 'bad', 'stop']
    new_data = []
    for cls in required_classes:
        cls_df = df[df['label'] == cls]
        count = len(cls_df)
        if count < 200:
            print(f"Synthesizing {200 - count} samples for '{cls}'...")
            # Use existing samples if available, otherwise use random noise around zero
            base_vectors = cls_df.drop('label', axis=1).values if count > 0 else [np.zeros(expected_features)]
            for _ in range(200 - count):
                base = base_vectors[np.random.randint(len(base_vectors))]
                noise = np.random.normal(0, 0.02, expected_features)
                new_data.append([cls] + (base + noise).tolist())
    
    if new_data:
        df_new = pd.DataFrame(new_data, columns=df.columns)
        df = pd.concat([df, df_new], ignore_index=True)

    # Final split
    X = df.drop('label', axis=1).astype(float).values
    y = df['label'].values

    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    # 4. Training
    print(f"Training Random Forest on {len(X_train)} samples...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        class_weight="balanced",
        random_state=42
    )
    model.fit(X_train, y_train)

    # 5. Evaluation
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {acc:.2%}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # 6. Save
    joblib.dump(model, MODEL_PKL)
    joblib.dump(le, os.path.join(BASE_DIR, "label_encoder.pkl"))
    joblib.dump(scaler, os.path.join(BASE_DIR, "scaler.pkl"))
    print("\nModel, Encoder, and Scaler saved successfully.")
    return True

if __name__ == "__main__":
    sys.exit(0 if train() else 1)
