# backend/categorize.py
import sys
import os
import json
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_SCRIPT = os.path.normpath(os.path.join(BASE_DIR, "..", "Categorization_Model", "main.py"))

def predict_from_message(msg: str) -> dict:
    """
    Call the model script and return parsed JSON.
    We'll call python main.py and send the message via stdin.
    """
    try:
        # Use subprocess to call the model script
        import subprocess

        # Call: python path/to/main.py and send message via stdin
        proc = subprocess.Popen(
            ["python", MODEL_SCRIPT],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, stderr = proc.communicate(input=msg, timeout=20)

        if stderr:
            # Non-fatal: include stderr in response if something is wrong.
            # But we prefer parsing stdout as JSON.
            # print to stderr for debugging
            print("Model stderr:", stderr, file=sys.stderr)

        try:
            parsed = json.loads(stdout)
            return parsed
        except json.JSONDecodeError:
            # Return raw output if not JSON
            return {"raw": stdout, "stderr": stderr}
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # message provided as command-line argument (take whole remainder)
        msg = " ".join(sys.argv[1:])
    else:
        msg = sys.stdin.read().strip()
    out = predict_from_message(msg)
    print(json.dumps(out))
