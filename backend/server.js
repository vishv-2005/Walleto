const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// --- ROUTE: Categorize Message ---
app.post("/categorize", (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Request body must be JSON. Set Content-Type: application/json" });
  }

  const message = req.body.message;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required in JSON body and must be a non-empty string. Example: { \"message\": \"Hi\" }" });
  }

  const pythonScript = path.join(__dirname, "categorize.py");
  const python = spawn("python", [pythonScript]);

  let result = "";
  let errorOutput = "";

  python.stdout.on("data", (data) => {
    result += data.toString();
  });

  python.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  python.on("close", (code) => {
    if (errorOutput) console.error("Python stderr:", errorOutput);

    try {
      const parsed = JSON.parse(result);
      if (parsed.error) {
        return res.status(500).json({ error: parsed.error });
      }
      // If Python considers message invalid, respond 422 so frontend can handle explicitly
      if (parsed.category === "invalid") {
        return res.status(422).json(parsed);
      }
      return res.json(parsed);
    } catch (err) {
      console.error("JSON parse error:", err);
      console.log("Raw Python output:", result);
      return res.status(500).json({
        error: "Invalid response from Python script",
        raw: result,
      });
    }
  });

  python.stdin.write(message);
  python.stdin.end();
});

// --- SERVER LISTEN ---
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
