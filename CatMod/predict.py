#!/usr/bin/env python3
"""
predict.py  (non-interactive)
Reads message via --message or stdin, loads a saved model, predicts category,
and prints a single JSON object to stdout.
Categories: order, inquiry, complaint, feedback, invalid
"""
import argparse
import json
import os
import re
import string
import sys
from pathlib import Path

import joblib

# Ensure UTF-8 stdout on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    else:
        os.environ.setdefault("PYTHONIOENCODING", "utf-8")
except Exception:
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    t = text.lower().strip()
    t = t.replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
    t = t.translate(str.maketrans("", "", string.punctuation))
    t = re.sub(r"\s+", " ", t)
    return t


def rule_based_label(text: str):
    t = text.lower()
    # Complaint rules (negative signals)
    if any(w in t for w in ["damag", "broken", "disappoint", "not good", "bad", "spoiled",
                             "mold", "leak", "worst", "terrible", "awful", "furious",
                             "unacceptable", "frustrated", "wrong item", "late delivery",
                             "rude", "expired", "missing"]):
        return "complaint"
    # Feedback rules (positive signals)
    if any(w in t for w in ["love your", "great service", "excellent", "amazing service",
                             "keep up", "best experience", "5 stars", "wonderful",
                             "impressed", "thank you so much", "highly recommend",
                             "fantastic", "outstanding"]):
        return "feedback"
    # Inquiry rules
    if re.search(r"\b(price|cost|how much|rate|what is the price|price of|when will|"
                 r"do you offer|what payment|is this in stock|return policy|how do i|"
                 r"can i get|delivery time|business hours|track my|shipping)\b", t):
        return "inquiry"
    # Order rules
    if re.search(r"\b(order|buy|want|need|i want|i'd like|i would like|purchase|"
                 r"book me|add to cart|checkout|deliver|send me|place.+order)\b", t):
        return "order"
    return None


def safe_print_json(obj):
    print(json.dumps(obj, ensure_ascii=False))


def try_load_model(candidate_paths):
    last_err = None
    for p in candidate_paths:
        try:
            p = Path(p)
            if not p.exists():
                last_err = f"Not found: {p}"
                continue
            model = joblib.load(str(p))
            return model, None
        except Exception as e:
            last_err = str(e)
    return None, last_err or "Model not found"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--message", "-m", type=str, help="Message to categorize")
    parser.add_argument("--model", type=str, default="", help="Optional explicit model path")
    parser.add_argument("--threshold", type=float, default=0.45, help="Probability threshold below which -> invalid")
    args = parser.parse_args()

    msg = args.message
    if not msg:
        try:
            msg = sys.stdin.read().strip()
        except Exception:
            msg = ""

    if not msg:
        safe_print_json({"error": "No message provided"})
        return 1

    # Quick rule override (high precision)
    rb = rule_based_label(msg)
    if rb:
        safe_print_json({"category": rb, "confidence": 1.0, "source": "rule"})
        return 0

    # Candidate model paths
    candidate_paths = []
    if args.model:
        candidate_paths.append(args.model)

    script_dir = Path(__file__).resolve().parent
    candidate_paths.extend([
        script_dir / "models" / "categorizer.pkl",
        script_dir.parent / "backend" / "models" / "categorizer.pkl",
        script_dir.parent / "models" / "categorizer.pkl",
        Path.cwd() / "models" / "categorizer.pkl",
    ])

    # Normalize and unique
    candidate_paths = [str(Path(p).resolve()) for p in candidate_paths]
    seen = set()
    candidate_paths = [p for p in candidate_paths if not (p in seen or seen.add(p))]

    model, err = try_load_model(candidate_paths)
    if err:
        safe_print_json({"error": f"Model load failed: {err}", "tried": candidate_paths})
        return 2

    txt = clean_text(msg)

    try:
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba([txt])[0]
            classes = list(model.classes_)
            top_idx = int(probs.argmax())
            top_prob = float(probs[top_idx])
            top_label = str(classes[top_idx])

            if top_prob < args.threshold:
                safe_print_json({"category": "invalid", "confidence": top_prob, "source": "model"})
                return 0

            safe_print_json({"category": top_label, "confidence": top_prob, "source": "model"})
            return 0
        else:
            pred = model.predict([txt])[0]
            safe_print_json({"category": str(pred), "confidence": None, "source": "model"})
            return 0
    except Exception as e:
        safe_print_json({"error": f"Prediction failed: {e}"})
        return 3


if __name__ == "__main__":
    sys.exit(main())
