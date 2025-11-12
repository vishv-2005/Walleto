import sys
import os
import json
import traceback

# ✅ Absolute path to your Categorization_Model folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "Categorization_Model")

# Add model directory to path
sys.path.append(MODEL_DIR)

try:
    from main import categorize_message
except Exception as e:
    print(json.dumps({"error": f"Failed to import model: {str(e)}"}))
    sys.exit(1)


def main():
    try:
        # Read the message passed from Node.js
        message = sys.stdin.read().strip()

        if not message:
            print(json.dumps({"error": "No message provided"}))
            sys.exit(1)

        # Use the model to categorize the message
        category = categorize_message(message)

        # Return result as JSON
        print(json.dumps({"message": message, "category": category}))

    except Exception as e:
        err_info = traceback.format_exc()
        print(json.dumps({"error": str(e), "trace": err_info}))
        sys.exit(1)


if __name__ == "__main__":
    main()
