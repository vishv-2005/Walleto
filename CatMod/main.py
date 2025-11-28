#!/usr/bin/env python3
"""
main.py
Train the classifier once and save models/categorizer.pkl
Builds dataset by parsing enhancement python files (no exec).
"""
import ast
import os
import re
import string
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# Ensure UTF-8 stdout on Windows
import sys
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    else:
        os.environ.setdefault("PYTHONIOENCODING", "utf-8")
except Exception:
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")


class MessageCategorizer:
    def __init__(self):
        # Pipeline: TF-IDF (unigrams + bigrams) + LogisticRegression
        self.model = Pipeline([
            ("tfidf", TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1, max_df=0.95)),
            ("clf", LogisticRegression(class_weight="balanced", max_iter=400))
        ])

    def clean_text(self, text: str) -> str:
        if not isinstance(text, str):
            text = str(text)
        t = text.lower().strip()
        t = t.replace("’", "'").replace("“", '"').replace("”", '"')
        # remove punctuation
        t = t.translate(str.maketrans("", "", string.punctuation))
        # normalize whitespace
        t = re.sub(r"\s+", " ", t)
        return t

    def build_dataset_from_pyfiles(self):
        """
        Parse enhancement python files and extract top-level list-of-strings variables.
        No execution — safe.
        """
        script_dir = Path(__file__).resolve().parent
        file_candidates = [
            script_dir / 'enhance_dataset.py',
            script_dir / 'enhance_training_data.py',
            script_dir / 'add_sentiment_examples.py',
            script_dir / 'enhanced_dataset.py',
            script_dir / 'enhanced_training_data.py',
            script_dir / 'enhanced_sentimental_examples.py'
        ]

        examples = []  # tuples (message, category)

        heuristics = {
            "inquiry": "inquiry",
            "order": "order",
            "invalid": "invalid",
            "sentiment": "sentiment",
            "positive": "positive",
            "negative": "negative",
            "neutral": "neutral",
            "feedback": "feedback",
            "complaint": "complaint",
            "review": "review"
        }

        def infer_category(varname: str) -> str:
            for k, v in heuristics.items():
                if k in varname.lower():
                    return v
            return "unknown"

        def extract_strings_from_node(node):
            vals = []
            if isinstance(node, ast.List) or isinstance(node, ast.Tuple):
                for elt in node.elts:
                    if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                        vals.append(elt.value.strip())
            elif isinstance(node, ast.Constant) and isinstance(node.value, str):
                vals.append(node.value.strip())
            return vals

        for f in file_candidates:
            if not f.exists():
                continue
            try:
                src = f.read_text(encoding="utf-8")
            except Exception:
                continue
            try:
                tree = ast.parse(src, filename=str(f))
            except Exception as e:
                print(f"⚠ Could not parse {f.name}: {e}")
                continue

            for node in tree.body:
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            varname = target.id
                            strings = extract_strings_from_node(node.value)
                            if strings:
                                cat = infer_category(varname)
                                for s in strings:
                                    examples.append((s, cat))
                elif isinstance(node, ast.AnnAssign):
                    target = node.target
                    if isinstance(target, ast.Name):
                        varname = target.id
                        strings = extract_strings_from_node(node.value) if node.value else []
                        if strings:
                            cat = infer_category(varname)
                            for s in strings:
                                examples.append((s, cat))

        if not examples:
            raise RuntimeError("No example strings found in enhancement python files.")

        df = pd.DataFrame(examples, columns=["message", "category"])
        # Clean messages using same function used at inference
        df["message"] = df["message"].astype(str).map(self.clean_text)
        df = df[df["message"].str.len() > 0].drop_duplicates(subset=["message"]).reset_index(drop=True)
        return df

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
    print("\nLoading dataset...")
    cat = MessageCategorizer()
    df = cat.build_dataset_from_pyfiles()

    print("\nDataset Overview:")
    print(f"Total Samples: {len(df)}")
    print(df["category"].value_counts())

    print("\nTraining model...")
    cat.train(df["message"], df["category"])

    # Quick verification: print classes and a sample predict_proba
    try:
        print("\nDEBUG: model.classes_ (after fit):", list(cat.model.classes_))
        sample = ["i want two cakes", "the cakes were damaged", "what is the price of cakes"]
        print("DEBUG: sample predict_proba (raw):")
        print(cat.model.predict_proba([cat.clean_text(s) for s in sample]))
    except Exception as e:
        print("DEBUG: verification error:", e)

    cat.save_model()
    print("\nDONE.")


if __name__ == "__main__":
    main()
