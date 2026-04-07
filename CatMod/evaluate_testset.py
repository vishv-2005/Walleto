import pandas as pd
import joblib
import re
import string
import os
import sys
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

# Ensure UTF-8 output
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

def clean_text(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    t = text.lower().strip()
    t = t.replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
    t = t.translate(str.maketrans("", "", string.punctuation))
    t = re.sub(r"\s+", " ", t)
    return t

def main():
    # Load dataset
    testset_path = os.path.join('..', 'testset.csv')
    if not os.path.exists(testset_path):
        print(f"Error: {testset_path} not found.")
        return

    df = pd.read_csv(testset_path)
    df['clean_msg'] = df['message'].apply(clean_text)

    # Load model
    model_path = os.path.join('models', 'categorizer.pkl')
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        return

    model = joblib.load(model_path)
    
    # Prediction
    y_true = df['label']
    y_pred = model.predict(df['clean_msg'])

    # Overall Accuracy
    acc = accuracy_score(y_true, y_pred)
    
    # Classification Report
    report = classification_report(y_true, y_pred, labels=model.classes_)
    
    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=model.classes_)
    cm_df = pd.DataFrame(cm, index=model.classes_, columns=model.classes_)

    # Output Results
    print("="*30)
    print("WHATSAPP CRM MODEL EVALUATION")
    print("="*30)
    print(f"\nOverall Accuracy: {acc:.2%}")
    print("\nClassification Report:")
    print(report)
    print("\nConfusion Matrix:")
    print(cm_df.to_string())
    
    # Comparison and Analysis (Automated part for the script)
    print("\n" + "="*30)
    print("PERFORMANCE ANALYSIS")
    print("="*30)
    
    # Identify best/worst
    report_dict = classification_report(y_true, y_pred, labels=model.classes_, output_dict=True)
    f1_scores = {label: report_dict[label]['f1-score'] for label in model.classes_}
    best_cat = max(f1_scores, key=f1_scores.get)
    worst_cat = min(f1_scores, key=f1_scores.get)
    
    print(f"- Best Performing Category: {best_cat} (F1-score: {f1_scores[best_cat]:.2f})")
    print(f"- Least Performing Category: {worst_cat} (F1-score: {f1_scores[worst_cat]:.2f})")
    
    # Confusion Analysis (Inquiry vs Complaint)
    inquiry_idx = list(model.classes_).index('Inquiry')
    complaint_idx = list(model.classes_).index('Complaint')
    
    inq_as_comp = cm[inquiry_idx, complaint_idx]
    comp_as_inq = cm[complaint_idx, inquiry_idx]
    
    print(f"\nConfusion Analysis (Inquiry vs Complaint):")
    print(f"- Inquiries misclassified as Complaints: {inq_as_comp}")
    print(f"- Complaints misclassified as Inquiries: {comp_as_inq}")
    
    if inq_as_comp > 0 or comp_as_inq > 0:
        print("Insight: There is overlap between Inquiry and Complaint, likely due to polite negative feedback or ambiguous queries.")
    
    print("\nComparison with Training Accuracy (91%):")
    diff = 0.91 - acc
    if diff > 0.05:
        print(f"The model shows a significant drop (~{diff:.1%}) on real-world data.")
        print("Reasons: Informal WhatsApp language (Hinglish), emojis, and very short messages (e.g., 'ok', 'hi') which differ from synthetic/standard training data.")
    else:
        print(f"The model is performing robustly with a minor difference of {diff:.1%}.")

if __name__ == "__main__":
    main()
