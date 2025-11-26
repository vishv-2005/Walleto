# main.py - Categorization model CLI with rule-based invalid detection + override
import os
import sys
import json
import traceback
from typing import List, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")
ISO_PATH = os.path.join(BASE_DIR, "iso.pkl")
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

# Optional outlier detector
from sklearn.ensemble import IsolationForest

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


def train_and_evaluate(contamination: float = 0.01) -> Tuple[object, object, object]:
    """
    Train TF-IDF + LogisticRegression and an IsolationForest for outlier detection.
    Saves model.pkl, vectorizer.pkl and iso.pkl (IsolationForest).
    contamination: estimated fraction of outliers in the data for IsolationForest.
    """
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

    # Train IsolationForest on all cleaned data (vectorized) - optional
    try:
        X_all_tfidf = vectorizer.transform(X_clean)
        iso = IsolationForest(random_state=42, contamination=contamination)
        iso.fit(X_all_tfidf.toarray())
        joblib.dump(iso, ISO_PATH)
        print(f"Saved IsolationForest to {ISO_PATH}")
    except Exception as e:
        iso = None
        print("Warning: failed to train IsolationForest:", str(e))

    joblib.dump(clf, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"\nSaved model to {MODEL_PATH} and vectorizer to {VECTORIZER_PATH}")

    return clf, vectorizer, (iso if 'iso' in locals() else None)


def _load_artifacts():
    """
    Load model, vectorizer, and iso (if present). Raise if model/vectorizer missing.
    """
    if not (os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH)):
        raise FileNotFoundError("Model/vectorizer not found. Train first by running: python main.py --train")
    clf = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    iso = None
    if os.path.exists(ISO_PATH):
        try:
            iso = joblib.load(ISO_PATH)
        except Exception as e:
            print("Warning: failed to load IsolationForest:", str(e))
            iso = None
    return clf, vectorizer, iso


# ---------- RULE-BASED INVALID DETECTION ----------
def _alpha_ratio(text: str) -> float:
    """Return fraction of characters that are alphabetic (letters)."""
    if not text:
        return 0.0
    letters = sum(1 for ch in text if ch.isalpha())
    return letters / max(1, len(text))


def _token_vocab_overlap(tokens: List[str], vectorizer) -> float:
    """Fraction of tokens that appear in the vectorizer vocabulary."""
    if not tokens:
        return 0.0
    vocab = getattr(vectorizer, "vocabulary_", None)
    if not vocab:
        return 0.0
    count = 0
    for t in tokens:
        if t in vocab:
            count += 1
    return count / len(tokens)


def categorize_message_with_rules(text: str) -> dict:
    """
    Rule-based invalid detection + classification.
    Returns: {"label": <str>, "diagnosis": {...}}
    Rules (combined):
      - If message length < 2 chars -> invalid
      - If token count (after preprocess) < 1 -> invalid
      - If alpha char ratio < 0.3 -> invalid (mostly symbols/numbers)
      - If token->vocab overlap < 0.25 -> invalid (words unseen in training)
      - If TF-IDF non-zero features == 0 -> invalid
      - If IsolationForest exists and flags -1 -> invalid
    If none of the rules fire -> normal classification (returns predicted label).
    If classifier predicts 'invalid' but rules didn't fire, use predict_proba to pick best non-invalid class.
    """
    clf, vectorizer, iso = _load_artifacts()

    # Clean and tokenise
    cleaned = preprocess_text(text)
    tokens = cleaned.split()

    # Basic stats
    char_len = len(text or "")
    clean_len = len(cleaned or "")
    token_count = len(tokens)
    alpha_ratio = _alpha_ratio(text)
    vocab_overlap = _token_vocab_overlap(tokens, vectorizer)

    # TF-IDF nonzero features
    features = vectorizer.transform([cleaned])
    nonzero = int(features.count_nonzero())

    # IsolationForest: optionally used as extra check (if iso present)
    iso_flag = None
    try:
        if iso is not None:
            iso_flag = int(iso.predict(features.toarray())[0])  # 1 = inlier, -1 = outlier
    except Exception:
        iso_flag = None

    # RULES
    rules_fired = []
    if char_len < 2:
        rules_fired.append("too_short_chars")
    if token_count < 1:
        rules_fired.append("too_few_tokens")
    if alpha_ratio < 0.30:
        rules_fired.append("low_alpha_ratio")
    if vocab_overlap < 0.25:
        rules_fired.append("low_vocab_overlap")
    if nonzero == 0:
        rules_fired.append("zero_tfidf_features")
    if iso_flag == -1:
        rules_fired.append("isolation_outlier")

    # If ANY rule fired -> treat as invalid
    if rules_fired:
        diagnosis = {
            "rules_fired": rules_fired,
            "char_len": char_len,
            "clean_len": clean_len,
            "token_count": token_count,
            "alpha_ratio": round(alpha_ratio, 3),
            "vocab_overlap": round(vocab_overlap, 3),
            "nonzero_tfidf": nonzero,
            "iso_flag": iso_flag,
        }
        return {"label": "invalid", "diagnosis": diagnosis}

    # Otherwise, safe to predict
    try:
        pred = clf.predict(features)[0]
    except Exception:
        pred = None

    diagnosis = {
        "rules_fired": rules_fired,
        "char_len": char_len,
        "clean_len": clean_len,
        "token_count": token_count,
        "alpha_ratio": round(alpha_ratio, 3),
        "vocab_overlap": round(vocab_overlap, 3),
        "nonzero_tfidf": nonzero,
        "iso_flag": iso_flag,
    }

    # If classifier predicts 'invalid' but NONE of our rules fired,
    # override that and pick the next-best class by probability (ignore 'invalid' class).
    if str(pred) == "invalid" and len(rules_fired) == 0:
        if hasattr(clf, "predict_proba"):
            probs = clf.predict_proba(features)[0]
            classes = list(clf.classes_)
            probs_adj = probs.copy()
            for i, c in enumerate(classes):
                if str(c) == "invalid":
                    probs_adj[i] = 0.0
            if probs_adj.sum() > 0:
                best_idx = int(probs_adj.argmax())
                final_label = str(classes[best_idx])
                diagnosis["override_from_invalid"] = True
                diagnosis["orig_pred_probs"] = {str(classes[i]): float(probs[i]) for i in range(len(classes))}
                return {"label": final_label, "diagnosis": diagnosis}
        diagnosis["override_from_invalid"] = False
        return {"label": str(pred), "diagnosis": diagnosis}

    # Normal case: return classifier prediction
    return {"label": str(pred), "diagnosis": diagnosis}


def demo_predictions():
    samples = [
        "I want to order a laptop",
        "My product is damaged and not working",
        "Do you ship internationally?",
        "Please cancel my recent order",
    ]
    print("\nDemo predictions:")
    for s in samples:
        res = categorize_message_with_rules(s)
        print(f"- '{s}' -> {res}")


def training_diagnostics():
    """
    Print dataset class distribution and a quick classification report when trained on existing CSV.
    """
    if not os.path.exists(DATA_PATH):
        print("No training CSV found at", DATA_PATH)
        return
    df = pd.read_csv(DATA_PATH)
    print("Training class distribution:")
    print(df['category'].value_counts())
    if 'invalid' in df['category'].unique():
        print("\nSample 'invalid' rows:")
        print(df[df['category'] == 'invalid'].head(20).to_string(index=False))

    # Quick train-on-train diagnostics (small dataset safe)
    try:
        X = df['message_text'].astype(str).tolist()
        y = df['category'].astype(str).tolist()
        Xc = [preprocess_text(t) for t in X]
        vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_df=0.95, norm='l2', sublinear_tf=True)
        Xtf = vec.fit_transform(Xc)
        clf = LogisticRegression(max_iter=500, solver='lbfgs', class_weight='balanced', random_state=42)
        clf.fit(Xtf, y)
        y_pred = clf.predict(Xtf)
        print("\nTraining-set classification report:")
        print(classification_report(y, y_pred, digits=3, zero_division=0))
    except Exception as e:
        print("Diagnostic error:", str(e))


# ---------------------------
# CLI entrypoint
# ---------------------------
def main_cli():
    try:
        # Handle --train
        if "--train" in sys.argv:
            contamination = 0.01
            for a in sys.argv[1:]:
                if a.startswith("--contam="):
                    try:
                        contamination = float(a.split("=", 1)[1])
                    except:
                        pass
            train_and_evaluate(contamination=contamination)
            return

        # Handle --diag
        if "--diag" in sys.argv:
            training_diagnostics()
            return

        # Message passed as first non-option arg?
        text_arg = None
        for a in sys.argv[1:]:
            if not a.startswith("--"):
                text_arg = a
                break

        # If not, read from stdin (piping)
        if not text_arg:
            stdin_text = sys.stdin.read().strip()
            if stdin_text:
                text_arg = stdin_text

        # If still missing, show help
        if not text_arg:
            help_msg = (
                "Usage:\n"
                "  python main.py --train [--contam=0.01]   # train model and isolation forest\n"
                "  python main.py --diag                     # run training diagnostics\n"
                "  python main.py \"Your message\"            # predict and print JSON\n"
                "  echo \"text\" | python main.py            # predict via stdin\n"
            )
            print(help_msg)
            return

        # Predict using rule-based detector
        result = categorize_message_with_rules(text_arg)
        out = {
            "message": text_arg,
            "category": result["label"],
            
        }
        print(json.dumps(out))
    except Exception as e:
        tb = traceback.format_exc()
        print(json.dumps({"error": str(e), "trace": tb}))


if __name__ == "__main__":
    main_cli()
