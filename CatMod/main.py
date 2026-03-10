#!/usr/bin/env python3
"""
main.py
Train the message categorizer and save to models/categorizer.pkl
Categories: order, inquiry, complaint, feedback, invalid
"""
import os
import re
import string
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# Ensure UTF-8 stdout on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    else:
        os.environ.setdefault("PYTHONIOENCODING", "utf-8")
except Exception:
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")

# Import training data (kept separate from logic)
from training_data import get_training_data


class MessageCategorizer:
    def __init__(self):
        self.model = Pipeline([
            ("tfidf", TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1, max_df=0.95)),
            ("clf", LogisticRegression(class_weight="balanced", max_iter=400))
        ])

    def clean_text(self, text: str) -> str:
        if not isinstance(text, str):
            text = str(text)
        t = text.lower().strip()
        t = t.replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
        t = t.translate(str.maketrans("", "", string.punctuation))
        t = re.sub(r"\s+", " ", t)
        return t

    def train(self, messages, labels):
        self.model.fit(messages, labels)

    def save_model(self, out_dir="models"):
        os.makedirs(out_dir, exist_ok=True)
        out_path = Path(out_dir) / "categorizer.pkl"
        joblib.dump(self.model, str(out_path))
        print(f"\nModel saved to: {out_path}")

    def load_model(self, path="models/categorizer.pkl"):
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"Model file not found at: {p}")
        self.model = joblib.load(str(p))


def main():
    print("\nLoading training data...")
    df = get_training_data()

    cat = MessageCategorizer()
    # Clean messages same as inference
    df["message"] = df["message"].astype(str).map(cat.clean_text)
    df = df[df["message"].str.len() > 0].drop_duplicates(subset=["message"]).reset_index(drop=True)

    print(f"\nDataset Overview:")
    print(f"Total Samples: {len(df)}")
    print(df["category"].value_counts())

    print("\nTraining model...")
    cat.train(df["message"], df["category"])

    # Quick verification
    try:
        print("\nModel classes:", list(cat.model.classes_))
        samples = [
            "i want two cakes",
            "the cakes were damaged",
            "what is the price of cakes",
            "great service thank you",
            "asdfghjkl",
        ]
        preds = cat.model.predict([cat.clean_text(s) for s in samples])
        for s, p in zip(samples, preds):
            print(f"  '{s}' -> {p}")
    except Exception as e:
        print("Verification error:", e)

    cat.save_model()
    print("\nDONE.")


if __name__ == "__main__":
    main()
