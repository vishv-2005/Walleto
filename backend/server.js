// server.js — Walleto WhatsApp Message Categorizer
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── JSON File Storage ──────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "messages.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

function loadMessages() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), "utf-8");
}

function addMessage(msg) {
  const messages = loadMessages();
  messages.unshift(msg);
  // keep last 500 messages
  if (messages.length > 500) messages.length = 500;
  saveMessages(messages);
}

// ── Categorization via Python ──────────────────────────────────────
function categorizeMessage(message) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "categorize.py");

    const py = spawn("python", [pythonScript], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let out = "";
    let err = "";

    py.stdout.on("data", (d) => (out += d.toString()));
    py.stderr.on("data", (d) => (err += d.toString()));

    py.on("error", (e) => reject(new Error(`Failed to start Python: ${e.message}`)));

    py.on("close", () => {
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(new Error(`Parse error: ${e.message} | stdout: ${out} | stderr: ${err}`));
      }
    });

    py.stdin.write(message);
    py.stdin.end();
  });
}

// ── WhatsApp Webhook ───────────────────────────────────────────────

// GET  /webhook  — Meta verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("✅ WEBHOOK_VERIFIED");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST /webhook  — Receive WhatsApp messages
app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (data.object === "whatsapp_business_account") {
    for (const entry of data.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "messages") {
          const value = change.value;
          const contacts = value.contacts || [];
          const messages = value.messages || [];

          for (const message of messages) {
            if (message.type === "text") {
              const from = message.from;
              const text = message.text.body;
              const contactName = contacts.find(c => c.wa_id === from)?.profile?.name || from;

              console.log(`📱 Message from ${contactName} (${from}): ${text}`);

              try {
                const result = await categorizeMessage(text);
                const record = {
                  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                  from,
                  name: contactName,
                  message: text,
                  category: result.category || "invalid",
                  confidence: result.confidence || 0,
                  source: result.source || "unknown",
                  timestamp: new Date().toISOString(),
                };
                addMessage(record);
                console.log(`🎯 Categorized: [${record.category}] ${text}`);
              } catch (err) {
                console.error("❌ Categorization failed:", err.message);
              }
            }
          }
        }
      }
    }
  }

  res.status(200).send("EVENT_RECEIVED");
});

// ── API Endpoints (for Dashboard) ─────────────────────────────────

// GET /api/messages — return all stored messages
app.get("/api/messages", (req, res) => {
  const messages = loadMessages();
  res.json(messages);
});

// GET /api/stats — return summary counts
app.get("/api/stats", (req, res) => {
  const messages = loadMessages();
  const stats = {
    total: messages.length,
    order: 0,
    inquiry: 0,
    complaint: 0,
    feedback: 0,
    invalid: 0,
  };
  for (const m of messages) {
    if (stats[m.category] !== undefined) stats[m.category]++;
  }
  res.json(stats);
});

// POST /categorize — manual categorization (for testing)
app.post("/categorize", async (req, res) => {
  const message = req.body.message;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Provide { \"message\": \"your text\" }" });
  }

  try {
    const result = await categorizeMessage(message);

    // Also store it as a manually tested message
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      from: "manual_test",
      name: "Manual Test",
      message: message.trim(),
      category: result.category || "invalid",
      confidence: result.confidence || 0,
      source: result.source || "unknown",
      timestamp: new Date().toISOString(),
    };
    addMessage(record);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages — clear all messages
app.delete("/api/messages", (req, res) => {
  saveMessages([]);
  res.json({ status: "cleared" });
});

// ── Serve Dashboard ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Walleto server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`📱 Webhook:   http://localhost:${PORT}/webhook`);
  console.log(`🔑 Verify Token: ${process.env.META_VERIFY_TOKEN || "(not set)"}\n`);
});
