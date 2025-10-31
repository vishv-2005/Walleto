import os
from typing import List

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, cross_val_predict

from preprocess import preprocess_text, ensure_nltk_data


MODEL_PATH = "model.pkl"
VECTORIZER_PATH = "vectorizer.pkl"
DATA_PATH = os.path.join("data", "messages.csv")


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
	"""5-fold stratified CV using a pipeline to avoid leakage."""
	pipe = Pipeline([
		("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_df=0.95, norm="l2", sublinear_tf=True)),
		("clf", LogisticRegression(max_iter=500, solver="lbfgs", class_weight="balanced", random_state=42)),
	])
	skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
	scores = cross_val_score(pipe, X_clean, y, cv=skf, scoring="accuracy")
	print("CV Accuracy: ", f"mean={scores.mean():.3f} std={scores.std():.3f}")
	# Detailed report via cross_val_predict
	y_pred_cv = cross_val_predict(pipe, X_clean, y, cv=skf)
	print("\nCV Classification Report:\n", classification_report(y, y_pred_cv, digits=3, zero_division=0))


def train_and_evaluate():
	ensure_nltk_data()
	data = load_data(DATA_PATH)
	X_raw: List[str] = data["message_text"].astype(str).tolist()
	y = data["category"].astype(str).tolist()

	X_clean = preprocess_corpus(X_raw)

	# Cross-validated evaluation for a more realistic estimate
	cross_validate(X_clean, y)

	# Train/test split for artifact training and a quick holdout view
	X_train, X_test, y_train, y_test = train_test_split(
		X_clean, y, test_size=0.25, random_state=42, stratify=y
	)

	vectorizer = TfidfVectorizer(
		ngram_range=(1, 2),
		min_df=1,
		max_df=0.95,
		norm="l2",
		sublinear_tf=True,
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
		raise FileNotFoundError(
			"Model/vectorizer not found. Train first by running: python main.py"
		)
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


if __name__ == "__main__":
	model, vec = train_and_evaluate()
	demo_predictions()
