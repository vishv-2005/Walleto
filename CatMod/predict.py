import sys
import os
import json
import joblib

# Add current dir to path to import predict_cli
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from predict_cli import hybrid_classify

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'models', 'categorizer_final.pkl')
    
    # Read from standards input (support empty inputs defensively)
    msg = sys.stdin.read().strip()
    if not msg:
        print(json.dumps({"error": "Empty message"}))
        return
        
    try:
        model = joblib.load(model_path)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
        return
        
    try:
        # Use existing logic without altering it
        prediction, source, clean_msg = hybrid_classify(msg, model)
        
        # Determine confidence
        confidence = 1.0 if source == "Rule-Based" else 0.82 
        
        result = {
            "category": prediction,
            "source": source,
            "confidence": confidence,
            "cleaned": clean_msg
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}))

if __name__ == "__main__":
    main()
