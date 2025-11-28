// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// POST /categorize
app.post("/categorize", (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Request body must be JSON. Set Content-Type: application/json" });
  }

  const message = req.body.message;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required in JSON body and must be a non-empty string. Example: { \"message\": \"Hi\" }" });
  }

  const pythonScript = path.join(__dirname, "categorize.py");

  const py = spawn("python", [pythonScript], {
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });

  let out = "";
  let err = "";

  py.stdout.on("data", (data) => {
    out += data.toString();
  });

  py.stderr.on("data", (data) => {
    err += data.toString();
  });

  py.on("error", (spawnErr) => {
    console.error("Failed to start Python process:", spawnErr);
    return res.status(500).json({ error: "Internal server error: failed to start python" });
  });

  py.on("close", (code) => {
    if (err && err.trim().length > 0) {
      console.error("Python stderr:", err);
    }

    if (!out || out.trim().length === 0) {
      return res.status(500).json({ error: "No output from Python script", stderr: err });
    }

    try {
      const parsed = JSON.parse(out);
      if (parsed.error) {
        return res.status(500).json({ error: parsed.error });
      }
      if (parsed.category === "invalid") {
        return res.status(422).json(parsed);
      }
      return res.json(parsed);
    } catch (parseErr) {
      console.error("Failed to parse Python output as JSON:", parseErr);
      console.log("Raw Python output:", out);
      return res.status(500).json({
        error: "Invalid response from Python script",
        raw: out,
        stderr: err
      });
    }
  });

  py.stdin.write(message);
  py.stdin.end();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
