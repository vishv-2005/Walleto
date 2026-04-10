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

// Log EVERY request so we can see if Meta is reaching us
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

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

// ── User File Storage ──────────────────────────────────────────────
const USERS_FILE = path.join(DATA_DIR, "users.json");

function loadUsers() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf-8");
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// ── Category Normalization ─────────────────────────────────────────
function normalizeCategory(cat) {
  if (!cat) return "invalid";
  const lower = cat.toLowerCase();
  if (lower === "order" || lower === "ordering" || lower === "logistic" || lower === "logistics") return "orders";
  if (lower === "complaint") return "complaints";
  if (lower === "inquiry") return "inquiries";
  if (lower === "feedback") return "feedback";
  return "invalid";
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
app.post("/webhook", (req, res) => {
  const data = req.body;

  // IMPORTANT: Respond to Meta immediately (they expect 200 within 5s)
  res.status(200).send("EVENT_RECEIVED");

  // Process messages in the background
  if (data.object === "whatsapp_business_account") {
    for (const entry of data.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "messages") {
          const value = change.value;
          if (!value.messages) continue; // skip status updates (read receipts etc.)

          const contacts = value.contacts || [];
          const messages = value.messages;

          for (const message of messages) {
            if (message.type === "text") {
              const from = message.from;
              const text = message.text.body;
              const contactName = contacts.find(c => c.wa_id === from)?.profile?.name || from;

              console.log(`📱 Message from ${contactName} (${from}): ${text}`);

              // Store message first, then categorize
              const record = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                from,
                name: contactName,
                message: text,
                category: "pending",
                confidence: 0,
                source: "pending",
                status: "Pending",
                timestamp: new Date().toISOString(),
              };

              // Categorize and update the record
              categorizeMessage(text)
                .then((result) => {
                  const category = result.category || "invalid";
                  
                  // --- Order Update Detection Logic ---
                  if (category === "order") {
                    const updateKeywords = ["instead", "change", "update", "pack", "cancel", "replace", "nikal", "minus", "plus", "extra"];
                    const isUpdate = updateKeywords.some(kw => text.toLowerCase().includes(kw));
                    
                    if (isUpdate) {
                      const messages = loadMessages();
                      // Find most recent pending/in-progress order from this sender
                      const prevOrder = messages.find(m => 
                        m.from === from && 
                        normalizeCategory(m.category) === "orders" && 
                        (m.status === "Pending" || m.status === "In Progress")
                      );
                      
                      if (prevOrder) {
                        console.log(`🔄 Updating message for ${from}: "${prevOrder.message}" -> "${text}"`);
                        prevOrder.message = `${prevOrder.message} (UD: ${text})`;
                        prevOrder.timestamp = new Date().toISOString(); // optional: bump timestamp
                        saveMessages(messages);
                        return; // Done, don't add as new message
                      }
                    }
                  }

                  record.category = category;
                  record.confidence = result.confidence || 0;
                  record.source = result.source || "unknown";
                  addMessage(record);
                  console.log(`🎯 Categorized: [${record.category}] ${text}`);
                })
                .catch((err) => {
                  console.error("❌ Categorization failed:", err.message);
                  // Still store the message even if categorization fails
                  record.category = "invalid";
                  record.source = "error";
                  addMessage(record);
                  console.log(`⚠️ Stored uncategorized: ${text}`);
                });
            }
          }
        }
      }
    }
  }
});

// ── API Endpoints (for Dashboard) ─────────────────────────────────

// GET /api/messages — return all stored messages
app.get("/api/messages", (req, res) => {
  const messages = loadMessages();
  res.json(messages);
});

// GET /api/stats — return summary counts grouped for frontend
app.get("/api/stats", (req, res) => {
  const messages = loadMessages();
  const stats = {
    total: messages.length,
    orders: 0,
    complaints: 0,
    inquiries: 0,
    feedback: 0,
    invalid: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
  };
  for (const m of messages) {
    const group = normalizeCategory(m.category);
    if (stats.hasOwnProperty(group)) {
      stats[group]++;
    } else {
      stats.invalid++;
    }
    const status = (m.status || "Pending");
    if (status === "Completed") stats.completed++;
    else if (status === "In Progress") stats.inProgress++;
    else stats.pending++;
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
      status: "Pending",
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

// ── Auth Endpoints ─────────────────────────────────────────────────

app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const users = loadUsers();
  if (users.find(u => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: "Account already exists" });
  }
  users.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    email: email.toLowerCase(),
    password,
    name: name || "",
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
  res.json({ success: true, message: "Account created" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const users = loadUsers();
  const user = users.find(u => u.email === email.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
});

// ── Categories CRUD ───────────────────────────────────────────────

app.get("/api/categories", (req, res) => {
  const messages = loadMessages();
  const grouped = { orders: [], complaints: [], inquiries: [], feedback: [], invalid: [] };
  for (const msg of messages) {
    const group = normalizeCategory(msg.category);
    grouped[group].push({
      id: msg.id,
      name: msg.message,
      status: msg.status || "Pending",
      from: msg.from,
      contactName: msg.name,
      confidence: msg.confidence,
      source: msg.source,
      originalCategory: msg.category,
      timestamp: msg.timestamp,
    });
  }
  res.json(grouped);
});

app.post("/api/categories/:category", async (req, res) => {
  const { category } = req.params;
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const catMap = { orders: "order", complaints: "complaint", inquiries: "inquiry", feedback: "feedback", others: "invalid", invalid: "invalid" };
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    from: "manual_app",
    name: "App User",
    message: name,
    category: catMap[category] || "invalid",
    confidence: 1,
    source: "manual",
    status: status || "Pending",
    timestamp: new Date().toISOString(),
  };
  addMessage(record);
  res.json({ success: true, item: { id: record.id, name: record.message, status: record.status } });
});

app.put("/api/categories/:category/:id", async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const messages = loadMessages();
  const msg = messages.find(m => m.id === id);
  if (!msg) return res.status(404).json({ error: "Item not found" });
  if (name !== undefined) msg.message = name;
  if (status !== undefined) msg.status = status;
  saveMessages(messages);
  res.json({ success: true });
});

app.delete("/api/categories/:category/:id", async (req, res) => {
  const { id } = req.params;
  const messages = loadMessages();
  saveMessages(messages.filter(m => m.id !== id));
  res.json({ success: true });
});

// ── Messages Status Update ────────────────────────────────────────

app.patch("/api/messages/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });
  
  const messages = loadMessages();
  const msg = messages.find(m => m.id === id);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  
  msg.status = status;
  saveMessages(messages);
  res.json({ success: true, id, status });
});

// ── Notifications ─────────────────────────────────────────────────

app.get("/api/notifications", (req, res) => {
  const messages = loadMessages();
  const notifications = messages.slice(0, 30).map(msg => ({
    id: msg.id,
    text: `New ${normalizeCategory(msg.category).replace(/s$/, "")}: "${msg.message}"`,
    from: msg.name || msg.from,
    category: msg.category,
    date: msg.timestamp,
    done: msg.notificationRead || false,
  }));
  res.json(notifications);
});

app.put("/api/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  const messages = loadMessages();
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.notificationRead = !(msg.notificationRead || false);
    saveMessages(messages);
  }
  res.json({ success: true });
});

// ── Profile ───────────────────────────────────────────────────────

app.get("/api/profile", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email query param required" });
  const users = loadUsers();
  const user = users.find(u => u.email === email.toString().toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ name: user.name || "", email: user.email });
});

app.put("/api/profile", async (req, res) => {
  const { email, name, newEmail } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const users = loadUsers();
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });
  if (name !== undefined) user.name = name;
  if (newEmail) user.email = newEmail.toLowerCase();
  saveUsers(users);
  res.json({ success: true });
});

// ── Debug / Diagnostic Page ────────────────────────────────────────
app.get("/debug", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Walleto Debug</title>
    <style>body{font-family:sans-serif;background:#111;color:#eee;padding:20px}
    .ok{color:#22c55e} .err{color:#ef4444} .warn{color:#f59e0b}
    pre{background:#222;padding:12px;border-radius:8px;overflow-x:auto}
    button{padding:8px 16px;background:#6c63ff;color:#fff;border:none;border-radius:6px;cursor:pointer;margin:4px}
    </style></head><body>
    <h1>🔧 Walleto Debug</h1>
    <h2>1. Server Config</h2>
    <pre>
VERIFY_TOKEN: ${process.env.META_VERIFY_TOKEN ? "✅ Set" : "❌ NOT SET"}
ACCESS_TOKEN: ${process.env.META_ACCESS_TOKEN ? "✅ Set (" + process.env.META_ACCESS_TOKEN.slice(0, 10) + "...)" : "❌ NOT SET"}
PHONE_NUMBER_ID: ${process.env.META_PHONE_NUMBER_ID || "❌ NOT SET"}
APP_SECRET: ${process.env.META_APP_SECRET ? "✅ Set" : "❌ NOT SET"}
PORT: ${process.env.PORT || 5000}
    </pre>

    <h2>2. Quick Tests</h2>
    <p>Click to simulate a webhook message (tests the full pipeline without WhatsApp):</p>
    <button onclick="simulateWebhook('I want to order biryani')">Test Order</button>
    <button onclick="simulateWebhook('My order arrived damaged')">Test Complaint</button>
    <button onclick="simulateWebhook('What is the price?')">Test Inquiry</button>
    <button onclick="simulateWebhook('Great service, love it!')">Test Feedback</button>
    <div id="result" style="margin-top:12px"></div>

    <h2>3. Webhook Checklist</h2>
    <ol>
      <li>Is <b>ngrok</b> running? → Run <code>ngrok http 5000</code> in another terminal</li>
      <li>Copy the <b>https://...ngrok-free.dev</b> URL from ngrok</li>
      <li>In Meta Dashboard → WhatsApp → <b>Configuration</b> → Edit Webhook:
        <ul>
          <li><b>Callback URL</b>: <code>https://YOUR-NGROK-URL/webhook</code></li>
          <li><b>Verify Token</b>: <code>${process.env.META_VERIFY_TOKEN}</code></li>
        </ul>
      </li>
      <li>Click <b>Verify and Save</b> → should succeed if ngrok + server running</li>
      <li><b>Subscribe to "messages"</b> → click Manage → check the "messages" checkbox</li>
    </ol>

    <script>
    async function simulateWebhook(text) {
      const payload = {
        object: "whatsapp_business_account",
        entry: [{
          id: "TEST", changes: [{
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              contacts: [{ profile: { name: "Test User" }, wa_id: "919999999999" }],
              messages: [{ from: "919999999999", id: "test123", timestamp: "${Math.floor(Date.now() / 1000)}",
                text: { body: text }, type: "text" }]
            }
          }]
        }]
      };
      const r = await fetch("/webhook", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      document.getElementById("result").innerHTML = '<pre class="ok">✅ Sent! Check dashboard at <a href="/" style="color:#6c63ff">http://localhost:5000</a></pre>';
    }
    </script>
    </body></html>
  `);
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
