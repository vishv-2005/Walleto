import re
from typing import List

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer


_NLTK_RESOURCES = {
	"stopwords": "corpora/stopwords",
	"wordnet": "corpora/wordnet",
	"punkt": "tokenizers/punkt",
	"punkt_tab": "tokenizers/punkt_tab",
	"omw-1.4": "corpora/omw-1.4",
}


def ensure_nltk_data() -> None:
	"""Ensure required NLTK datasets are available; download if missing.

	This function is safe to call multiple times.
	"""
	for resource_name, resource_path in _NLTK_RESOURCES.items():
		try:
			nltk.data.find(resource_path)
		except LookupError:
			nltk.download(resource_name, quiet=True)


def _remove_punctuation(text: str) -> str:
	return re.sub(r"[^\w\s]", " ", text)


def _tokenize(text: str) -> List[str]:
	return nltk.word_tokenize(text)


def preprocess_text(text: str) -> str:
	"""Clean and normalize a message string.

	Steps:
	- lowercase
	- remove punctuation
	- tokenize
	- remove stopwords
	- lemmatize
	Returns a whitespace-joined cleaned string.
	"""
	if not isinstance(text, str):
		return ""

	ensure_nltk_data()

	lemmatizer = WordNetLemmatizer()
	stop_words = set(stopwords.words("english"))

	text = text.lower()
	text = _remove_punctuation(text)
	tokens = _tokenize(text)
	filtered_tokens: List[str] = []
	for tok in tokens:
		if tok.isdigit():
			filtered_tokens.append(tok)
			continue
		if tok in stop_words:
			continue
		lemma = lemmatizer.lemmatize(tok)
		if len(lemma) > 1:
			filtered_tokens.append(lemma)

	return " ".join(filtered_tokens)
