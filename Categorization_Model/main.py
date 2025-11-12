# Categorization_Model/main.py
import os
import sys
import json
import traceback
from typing import List, Tuple

# Ensure we import local preprocess module (same folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Use absolute paths so the script works when called from another cwd
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")
DATA_PATH = os.path.join(BASE_DIR, "data", "messages.csv")

# --- ML imports ---
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, cross_val_predict

# Local preprocessing
from preprocess import preprocess_text, ensure_nltk_data


def load_data(csv_path: str) -> pd.DataFrame:
    data = pd.read_csv(csv_path)
    expected_cols = {"message_text", "category"}
    missing = expected_cols - set(map(str, data.columns))
    if missing:
        raise ValueError(f"CSV missing required columns: {missing}")
    return data


def preprocess_corpus(texts: List[str]) -> List[str]:
    return [preprocess_text(t) for t in texts]


def cross_validate(X_clean: List[str], y: List[str]) -> None:
    pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    max_df=0.95,
                    norm="l2",
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=500, solver="lbfgs", class_weight="balanced", random_state=42
                ),
            ),
        ]
    )
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(pipe, X_clean, y, cv=skf, scoring="accuracy")
    print("CV Accuracy: ", f"mean={scores.mean():.3f} std={scores.std():.3f}")
    y_pred_cv = cross_val_predict(pipe, X_clean, y, cv=skf)
    print("\nCV Classification Report:\n", classification_report(y, y_pred_cv, digits=3, zero_division=0))


def train_and_evaluate() -> Tuple[object, object]:
    """Train model and save artifacts to MODEL_PATH and VECTORIZER_PATH."""
    ensure_nltk_data()
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training CSV not found at: {DATA_PATH}")

    data = load_data(DATA_PATH)
    X_raw: List[str] = data["message_text"].astype(str).tolist()
    y = data["category"].astype(str).tolist()

    X_clean = preprocess_corpus(X_raw)

    # Cross-validated evaluation
    cross_validate(X_clean, y)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_clean, y, test_size=0.25, random_state=42, stratify=y
    )

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2), min_df=1, max_df=0.95, norm="l2", sublinear_tf=True
    )
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)

    clf = LogisticRegression(max_iter=500, solver="lbfgs", class_weight="balanced", random_state=42)
    clf.fit(X_train_tfidf, y_train)

    y_pred = clf.predict(X_test_tfidf)
    acc = accuracy_score(y_test, y_pred)
    print("\nHoldout Accuracy:", f"{acc:.3f}")
    print("\nHoldout Classification Report:\n", classification_report(y_test, y_pred, digits=3, zero_division=0))

    joblib.dump(clf, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"\nSaved model to {MODEL_PATH} and vectorizer to {VECTORIZER_PATH}")

    return clf, vectorizer


def _load_artifacts():
    if not (os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH)):
        raise FileNotFoundError("Model/vectorizer not found. Train first by running: python main.py --train")
    clf = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    return clf, vectorizer


def categorize_message(text: str) -> str:
    """Predict category for a new message string."""
    clf, vectorizer = _load_artifacts()
    cleaned = preprocess_text(text)
    features = vectorizer.transform([cleaned])
    pred = clf.predict(features)[0]
    return pred


def demo_predictions():
    samples = [
        "I want to order a laptop",
        "My product is damaged and not working",
        "Do you ship internationally?",
        "Please cancel my recent order",
    ]
    print("\nDemo predictions:")
    for s in samples:
        label = categorize_message(s)
        print(f"- '{s}' -> {label}")


def predict_cli_from_text(text: str):
    """Helper to produce a JSON string for CLI usage."""
    try:
        cat = categorize_message(text)
        out = {"message": text, "category": cat}
        print(json.dumps(out))
    except Exception as e:
        print(json.dumps({"error": str(e)}))


def main_cli():
    # CLI options:
    # python main.py --train        -> runs training (needs data/messages.csv)
    # python main.py --demo         -> runs demo_predictions() (uses saved artifacts)
    # python main.py "some message" -> predict that message and print JSON
    # echo "some message" | python main.py -> predict reading stdin
    try:
        if "--train" in sys.argv:
            train_and_evaluate()
            return
        if "--demo" in sys.argv:
            demo_predictions()
            return

        # If message passed as argument, use it. Otherwise read stdin.
        text_arg = None
        # first non-option argument
        for a in sys.argv[1:]:
            if not a.startswith("--"):
                text_arg = a
                break

        if text_arg:
            predict_cli_from_text(text_arg)
            return

        # Fallback to reading stdin (works with piping)
        stdin_text = sys.stdin.read().strip()
        if stdin_text:
            predict_cli_from_text(stdin_text)
            return

        # No args/stdin: show help
        help_msg = (
            "Usage:\n"
            "  python main.py --train        # train and save model (needs data/messages.csv)\n"
            "  python main.py --demo         # demo predictions (loads saved model)\n"
            "  python main.py \"your text\"   # predict and print JSON\n"
            "  echo \"your text\" | python main.py  # predict from stdin\n"
        )
        print(help_msg)
    except Exception as e:
        tb = traceback.format_exc()
        print(json.dumps({"error": str(e), "trace": tb}))


if __name__ == "__main__":
    main_cli()
