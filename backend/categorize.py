# backend/categorize.py - robust wrapper for model inference
import sys, os, json, subprocess, traceback
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_SCRIPT = (BASE_DIR.parent / "CatMod" / "predict.py").resolve()
PY = sys.executable or "python"

def predict_from_message(msg: str, timeout: int = 10) -> dict:
    try:
        if not MODEL_SCRIPT.exists():
            return {"error": f"Model script not found: {MODEL_SCRIPT}"}

        proc = subprocess.Popen([PY, str(MODEL_SCRIPT)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            stdout, stderr = proc.communicate(msg, timeout=timeout)
        except subprocess.TimeoutExpired:
            proc.kill()
            return {"error": "Model script timeout"}

        # Include stderr for debugging
        if stderr and stderr.strip():
            # attach stderr to result so Node can log it
            pass

        try:
            parsed = json.loads(stdout)
            return parsed
        except Exception:
            return {"raw": stdout, "stderr": stderr}
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        msg = " ".join(sys.argv[1:])
    else:
        msg = sys.stdin.read().strip()
    out = predict_from_message(msg)
    print(json.dumps(out, ensure_ascii=False))
