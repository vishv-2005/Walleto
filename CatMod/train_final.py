import pandas as pd
import numpy as np
import re
import string
import os
import sys
import joblib
from pathlib import Path

# Ensure training_data.py is in target path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from training_data import get_training_data
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# Ensure UTF-8 output
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# --- 1. Robust Preprocessing Pipeline ---

SLANG_MAP = {
    "u": "you", "r": "are", "pls": "please", "plz": "please", "k": "okay", "ok": "okay",
    "thx": "thanks", "ty": "thanks", "bro": "friend", "sir": "professional",
    "bhez": "send", "bhejo": "send", "kya": "what", "hai": "is", "kab": "when",
    "kaise": "how", "ni": "no", "nahi": "no", "nahin": "no", "not": "not",
    "jaldi": "fast", "asap": "fast", "now": "immediately", "bro": "friend",
    "iska": "this", "kitna": "how much", "batao": "tell", "kuch": "something",
    "aisa": "like this", "yaar": "friend", "bhai": "brother",
    "dedo": "give", "dena": "give", "do": "give"
}

EMOJI_MAP = {
    "😡": " [angry] ", "😠": " [angry] ", "🤬": " [angry] ",
    "👍": " [good] ", "👌": " [okay] ", "✅": " [done] ",
    "❤️": " [love] ", "😍": " [love] ", "😊": " [happy] ",
    "😂": " [laugh] ", "🤣": " [laugh] ", "🙄": " [annoyed] ",
    "😒": " [annoyed] ", "🙏": " [please] ", "🚚": " [delivery] ",
    "📦": " [package] ", "❓": " [question] ", "❌": " [wrong] ",
    "🙂": " [happy] "
}

def clean_whatsapp_text(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    
    # 1. Lowercase
    t = text.lower().strip()
    
    # 2. Emoji Mapping
    for char, mapped in EMOJI_MAP.items():
        t = t.replace(char, mapped)
    
    # 3. Squash Repeated Characters (e.g., soooo -> so)
    t = re.sub(r'(.)\1{2,}', r'\1', t)
    
    # 4. Remove Punctuation (except brackets used for emojis tags)
    t = re.sub(f'[{re.escape(string.punctuation.replace("[", "").replace("]", ""))}]', ' ', t)
    
    # 5. Slang & Hinglish Normalization
    words = t.split()
    normalized_words = [SLANG_MAP.get(w, w) for w in words]
    t = " ".join(normalized_words)
    
    # 6. Final white space cleaning
    t = re.sub(r'\s+', ' ', t).strip()
    
    return t

# --- 2. Main Logic ---

def main():
    # Load Training Dataset (Original balanced)
    train_path = os.path.join('..', 'data_balanced.csv')
    test_path = os.path.join('..', 'testset.csv')
    
    if not os.path.exists(train_path):
        print(f"Error: {train_path} not found.")
        return
    
    train_df = pd.read_csv(train_path)
    train_df.columns = ['message', 'label'] # Canonicalize columns
    
    # --- Label Mapping: Consolidate to 5 Target Categories ---
    label_map = {
        'Ordering': 'order',
        'Logistics': 'order',
        'Inquiry': 'inquiry',
        'Complaint': 'complaint',
        'Irrelevant': 'invalid',
        'order': 'order',
        'inquiry': 'inquiry',
        'complaint': 'complaint',
        'feedback': 'feedback',
        'invalid': 'invalid'
    }
    train_df['label'] = train_df['label'].map(label_map).fillna('invalid')

    # --- Append high-quality examples from training_data.py ---
    programmatic_df = get_training_data()
    programmatic_df = programmatic_df.rename(columns={'category': 'label'})
    
    # Load Massive 15K Dataset
    synthetic_path = os.path.join(os.path.dirname(__file__), "synthetic_data_15k.csv")
    if os.path.exists(synthetic_path):
        synth_df = pd.read_csv(synthetic_path)
        train_df = pd.concat([train_df, programmatic_df, synth_df], ignore_index=True)
    else:
        train_df = pd.concat([train_df, programmatic_df], ignore_index=True)
    
    # Drop any NaN values that might have been introduced
    train_df = train_df.dropna(subset=['message', 'label'])
    
    print(f"Dataset Size after consolidation: {len(train_df)}")
    print("Category Distribution:\n", train_df['label'].value_counts())

    # Preprocessing
    train_df['clean_msg'] = train_df['message'].apply(clean_whatsapp_text)
    
    # Split: 80% Training, 20% Testing (From the balanced set)
    X = train_df['clean_msg']
    y = train_df['label']
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Load separate Real-world Testset if exists
    if os.path.exists(test_path):
        external_test = pd.read_csv(test_path)
        external_test.columns = ['message', 'label']
        # Apply same mapping to testset
        external_test['label'] = external_test['label'].map(label_map).fillna('invalid')
        external_test['clean_msg'] = external_test['message'].apply(clean_whatsapp_text)
        X_ext = external_test['clean_msg']
        y_ext = external_test['label']
    else:
        X_ext, y_ext = None, None
    
    print(f"Internal Split: {len(X_train)} Train, {len(X_test)} Test")
    
    # Feature Engineering: Hybrid Word + Char TF-IDF
    features = FeatureUnion([
        ('word', TfidfVectorizer(ngram_range=(1, 3), analyzer='word', min_df=2, max_df=0.9, stop_words='english')),
        ('char', TfidfVectorizer(ngram_range=(2, 5), analyzer='char', min_df=2, max_df=0.9))
    ])
    
    # Pipeline: Classifier (LinearSVC with balanced weights)
    pipeline = Pipeline([
        ('features', features),
        ('clf', LinearSVC(class_weight='balanced', random_state=42, max_iter=2000))
    ])
    
    # Train
    print("Training the final model...")
    pipeline.fit(X_train, y_train)
    
    # Save the trained model immediately after training
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'models', 'categorizer_final.pkl')
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(pipeline, model_path)
    print(f"\n[INFO] Model saved successfully to {model_path}")

    # Calculate Accuracy
    y_train_pred = pipeline.predict(X_train)
    train_acc = accuracy_score(y_train, y_train_pred)
    
    y_test_pred = pipeline.predict(X_test)
    test_acc = accuracy_score(y_test, y_test_pred)
    
    # Evaluate on Real-world Testset if exists
    if X_ext is not None:
        y_ext_pred = pipeline.predict(X_ext)
        real_acc = accuracy_score(y_ext, y_ext_pred)
    else:
        real_acc = None
        y_ext_pred = None
    
    # Output Results
    print("\n" + "="*40)
    print("WHATSAPP CRM FINAL MODEL EVALUATION")
    print("="*40)
    print(f"\nTraining Accuracy (80% Balanced): {train_acc:.2%}")
    print(f"Internal Test Accuracy (20% Balanced): {test_acc:.2%}")
    if real_acc is not None:
        print(f"External Real-world Test Accuracy (testset.csv): {real_acc:.2%}")
    
    if y_ext_pred is not None:
        print("\nReal-world Classification Report:")
        print(classification_report(y_ext, y_ext_pred))
        
        print("\nReal-world Confusion Matrix:")
        classes = sorted(y_train.unique())
        cm = confusion_matrix(y_ext, y_ext_pred, labels=classes)
        cm_df = pd.DataFrame(cm, index=classes, columns=classes)
        print(cm_df.to_string())
    
    # Simple Analysis
    print("\n" + "="*40)
    print("PERFORMANCE ANALYSIS")
    print("="*40)
    
    if y_ext_pred is not None:
        report_dict = classification_report(y_ext, y_ext_pred, output_dict=True)
        # Use .get() defensively as some classes may not be present in the external testset
        f1_scores = {label: report_dict.get(label, {}).get('f1-score', 0) for label in classes}
        
        # Filter out labels with 0 f1-score for weakest/best calculation
        valid_f1s = {k: v for k, v in f1_scores.items() if v > 0}
        
        if valid_f1s:
            weakest = min(valid_f1s, key=valid_f1s.get)
            best = max(valid_f1s, key=valid_f1s.get)
            print(f"- Best Performing Class (Real-world): {best} ({valid_f1s[best]:.2f})")
            print(f"- Weakest Performing Class (Real-world): {weakest} ({valid_f1s[weakest]:.2f})")
    
    # Model already saved above

    print("\nSUCCESS: Retraining complete with full accuracy breakdown!")

if __name__ == "__main__":
    main()
