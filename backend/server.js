const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// --- ROUTE: Categorize Message ---
app.post("/categorize", (req, res) => {
  const message = req.body.message;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Resolve the Python script path
  const pythonScript = path.join(__dirname, "categorize.py");

  // Spawn Python process
  const python = spawn("python", [pythonScript]);

  let result = "";
  let errorOutput = "";

  // Collect Python script output
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

  // Send message to Python via stdin
  python.stdin.write(message);
  python.stdin.end();
});

// --- SERVER LISTEN ---
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
