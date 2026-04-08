import joblib
import re
import string
import os
import sys

# Ensure UTF-8 output for terminal (specifically for Hinglish/Emojis on Windows)
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# --- Constants & Preprocessing (Must match train_final.py) ---

SLANG_MAP = {
    "u": "you", "r": "are", "pls": "please", "plz": "please", "k": "okay", "ok": "okay",
    "thx": "thanks", "ty": "thanks", "bro": "friend", "sir": "professional",
    "bhez": "send", "bhejo": "send", "kya": "what", "hai": "is", "kab": "when",
    "kaise": "how", "ni": "no", "nahi": "no", "nahin": "no", "not": "not",
    "jaldi": "fast", "asap": "fast", "now": "immediately", "bro": "friend",
    "iska": "this", "kitna": "how much", "batao": "tell", "kuch": "something",
    "aisa": "like this", "yaar": "friend", "bhai": "brother",
    "bekaar": "bad", "bakwas": "worst", "kharab": "bad",
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

# --- 1. Hybrid Rule-Based Overrides ---
# High-precision keywords that override ML model for immediate accuracy on known cases.
PRODUCT_WORDS = {
    "cake", "pizza", "burger", "set", "piece", "packet", "kg", "gram", "unit", 
    "bottle", "box", "order", "item", "product", "pastry", "cookie"
}

# Specific greetings to force Irrelevant
GREETING_WORDS = {
    "hi", "hello", "ok", "thanks", "jai", "namaste", "good morning", "good evening", 
    "shree krishna", "shri krishna", "shree ram", "ram ram", "radhe radhe"
}

def clean_whatsapp_text(text: str) -> str:
    """Exact identical preprocessing logic from training."""
    if not isinstance(text, str):
        text = str(text)
    
    # 1. Lowercase
    t = text.lower().strip()
    
    # 2. Emoji Mapping
    for char, mapped in EMOJI_MAP.items():
        t = t.replace(char, mapped)
    
    # 3. Squash Repeated Characters (e.g., soooo -> so)
    t = re.sub(r'(.)\1{2,}', r'\1', t)
    
    # 4. Remove Punctuation (except brackets used for emoji tags)
    t = re.sub(f'[{re.escape(string.punctuation.replace("[", "").replace("]", ""))}]', ' ', t)
    
    # 5. Slang & Hinglish Normalization
    words = t.split()
    normalized_words = [SLANG_MAP.get(w, w) for w in words]
    t = " ".join(normalized_words)
    
    # 6. Final white space cleaning
    t = re.sub(r'\s+', ' ', t).strip()
    
    return t

def hybrid_classify(msg, model):
    """
    Combines machine learning with prioritized post-processing rules.
    Priority: Complaint > Logistics > Ordering > Irrelevant > Inquiry > ML Prediction
    """
    clean_msg = clean_whatsapp_text(msg)
    words = clean_msg.split()
    
    # 1. Start with ML Prediction as baseline
    ml_prediction = model.predict([clean_msg])[0]
    final_prediction = ml_prediction
    source = "ML-Model"
    
    # --- 2. RULE LAYER (Priority: Precedence goes to checks lower in the function) ---
    
    # 2a) Inquiry Detection (Lowest Priority)
    inquiry_kws = ["?", "what", "price", "how", "details", "kitna", "kya", "cost", "paisa", "catalog", "discount", "offer", "rate"]
    if any(kw in clean_msg for kw in inquiry_kws):
        final_prediction = "Inquiry"
        source = "Rule-Based"

    # 2b) Irrelevant & Short Message Detection
    padded_msg = f" {clean_msg} "
    is_greeting = any(f" {kw} " in padded_msg for kw in GREETING_WORDS)
    is_short = len(words) <= 3 and not any(kw in clean_msg for kw in inquiry_kws)
    if is_greeting or is_short:
        final_prediction = "Irrelevant"
        source = "Rule-Based"

    # 2c) Ordering Detection (CRITICAL)
    # Include both original Hinglish verbs and their normalized counterparts (give, send)
    order_verbs = ["dedo", "bhejo", "bhijwa do", "pack kar do", "order kar do", "send kar do", "confirm", "book", "give", "send"]
    has_number = any(char.isdigit() for char in clean_msg)
    has_product = any(prod in clean_msg for prod in PRODUCT_WORDS)
    
    # Match: "1 cake" (number + product) or "bhejo/send" (order verb)
    if any(verb in clean_msg for verb in order_verbs) or (has_number and has_product):
        final_prediction = "Ordering"
        source = "Rule-Based"

    # 2d) Logistics Detection
    logistics_kws = ["tracking", "status", "delivery", "kab tak", "kaha hai", "shipped", "dispatched", "track", "received"]
    if any(kw in clean_msg for kw in logistics_kws):
        # Specific override for "not received" (belongs in Complaint)
        if "not" not in clean_msg:
            final_prediction = "Logistics"
            source = "Rule-Based"

    # 2e) Complaint Detection (Highest Priority)
    complaint_kws = ["dont like", "not good", "bad", "worst", "issue", "problem", "hate", "delay", "late", "refund", "damage", "faulty", "wrong", "not received", "bakwas", "bekar"]
    if any(kw in clean_msg for kw in complaint_kws):
        final_prediction = "Complaint"
        source = "Rule-Based"

    return final_prediction, source, clean_msg

# --- Main CLI Logic ---

def main():
    # Header
    print("\n" + "="*50)
    print("WHATSAPP CRM MESSAGE CLASSIFIER - REAL-TIME TEST")
    print("="*50)
    
    # Load Model
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'models', 'categorizer_final.pkl')
    
    if not os.path.exists(model_path):
        print(f"\n[ERROR] Model not found at: {model_path}")
        print("Please run your training script (train_final.py) first.")
        return

    print("\n[INFO] Loading trained model...")
    try:
        model = joblib.load(model_path)
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        return

    print("[SUCCESS] Model loaded successfully!")
    print("\n" + "-"*50)
    print("INSTRUCTIONS:")
    print("- Enter any WhatsApp message (supports Hinglish, emojis, typos).")
    print("- Type 'exit' or 'quit' to stop.")
    print("-" * 50)
    
    while True:
        try:
            # Get Input
            msg = input("\nEnter message: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\nTest session terminated. Goodbye!")
            break

        # Handle Exit
        if msg.lower() in ['exit', 'quit']:
            print("Session closed. Happy Categorizing!")
            break

        # Handle Empty
        if not msg:
            print("[WARNING] Please enter some text to classify.")
            continue

        # 1. Hybrid Classification (Rules + ML)
        try:
            prediction, source, clean_msg = hybrid_classify(msg, model)
            
            # 3. Display Result
            print(f"\n   [CLEANED] -> {clean_msg}")
            print(f"   [RESULT]  -> {prediction} ({source})")
            
        except Exception as e:
            print(f"[ERROR] Inference failed: {e}")

if __name__ == "__main__":
    main()
