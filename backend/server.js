// server.js — Walleto WhatsApp Message Categorizer
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mongoose Models
const User = require("./models/User");
const Message = require("./models/Message");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Log EVERY request so we can see if Meta is reaching us
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// ── MongoDB Connection ────────────────────────────────────────────
let dbConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI not set — running with JSON file storage only");
    return;
  }
  try {
    await mongoose.connect(uri);
    dbConnected = true;
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.warn("⚠️  Falling back to JSON file storage");
  }
}

connectDB();

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
  // Always write to JSON (local fallback)
  const messages = loadMessages();
  messages.unshift(msg);
  // keep last 500 messages
  if (messages.length > 500) messages.length = 500;
  saveMessages(messages);

  // Also write to MongoDB if connected
  if (dbConnected) {
    Message.create(msg).catch(err => console.error("MongoDB addMessage error:", err.message));
  }
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
  if (lower === "order" || lower === "ordering" || lower === "orders") return "orders";
  if (lower === "complaint" || lower === "complaints") return "complaints";
  if (lower === "inquiry" || lower === "inquiries") return "inquiries";
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
                status: null,
                timestamp: new Date().toISOString(),
              };

              // Categorize and update the record
              categorizeMessage(text)
                .then((result) => {
                  // --- Fast-Track Inquiry Detection ---
                  const inquiryRuleKeywords = ["price", "cost", "available", "when", "how", "where", "info", "details", "product"];
                  const isInquiryRule = inquiryRuleKeywords.some(kw => text.toLowerCase().includes(kw));

                  const category = isInquiryRule ? "inquiry" : (result.category || "invalid");
                  
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
                  const defaultStatuses = { order: "Pending", complaint: "Open", inquiry: "Not Answered", feedback: null, invalid: null };
                  record.status = defaultStatuses[category] !== undefined ? defaultStatuses[category] : null;
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
    version: "1.0.1",
    total: messages.length,
    orders: 0, orderPending: 0, orderInProgress: 0, orderCompleted: 0,
    complaints: 0, complaintOpen: 0, complaintResolved: 0,
    inquiries: 0, inquiryNotAnswered: 0, inquiryAnswered: 0,
    feedback: 0, invalid: 0,
  };
  for (const m of messages) {
    const group = normalizeCategory(m.category);
    if (stats.hasOwnProperty(group)) {
      stats[group]++;
    } else {
      stats.invalid++;
    }
    
    // Category-specific statuses
    const norm = group.toLowerCase();
    const st = (m.status || "").toLowerCase();
    
    if (norm.includes("order")) {
      if (st.includes("completed")) stats.orderCompleted++;
      else if (st.includes("progress")) stats.orderInProgress++;
      else stats.orderPending++;
    } else if (norm.includes("complaint")) {
      if (st.includes("resolved")) stats.complaintResolved++;
      else stats.complaintOpen++;
    } else if (norm.includes("inquir")) {
      const lowerSt = st.toLowerCase();
      const lowerMsg = (m.message || "").toLowerCase();
      
      // Fast-Track Logic: If it contains inquiry keywords, treat as inquiry
      const inquiryKeywords = ["price", "cost", "available", "when", "how", "where", "info", "details"];
      const isForceInquiry = inquiryKeywords.some(kw => lowerMsg.includes(kw));

      if (lowerSt === "answered" || lowerSt.includes("done")) {
        stats.inquiryAnswered++;
      } else {
        stats.inquiryNotAnswered++;
      }
    }
  }
  
  stats.version = "1.0.3";
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
    const defaultTestStatuses = { order: "Pending", complaint: "Open", inquiry: "Not Answered", feedback: null, invalid: null };
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      from: "manual_test",
      name: "Manual Test",
      message: message.trim(),
      category: result.category || "invalid",
      confidence: result.confidence || 0,
      source: result.source || "unknown",
      status: defaultTestStatuses[result.category || "invalid"],
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

app.post("/api/generate-post", async (req, res) => {
  const { businessDescription, festival, offer } = req.body;
  if (!businessDescription || businessDescription.trim().length === 0) {
    return res.status(400).json({ error: "Please enter a description for your business or product." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return res.status(400).json({
      error: "AI Keys Missing: Please add GEMINI_API_KEY or OPENAI_API_KEY to your backend/.env file to generate posts."
    });
  }

  const systemPrompt = `
You are an expert Indian local-business marketing copywriter and visual campaign designer.

Generate a COMPLETE marketing package for a small business.

BUSINESS DETAILS:
- Business: ${businessDescription}
- Festival/Occasion: ${festival || "General Promotion"}
- Offer: ${offer || "No Offer"}

IMPORTANT:
Return ONLY valid raw JSON.
Do NOT use markdown.
Do NOT wrap in \`\`\`.
Do NOT explain anything.

Return EXACTLY this structure:

{
  "text": "...",
  "posterText": "...",
  "festivalWish": "...",
  "imagePrompt": "..."
}

━━━━━━━━━━━━━━━━━━━
1. TEXT RULES
━━━━━━━━━━━━━━━━━━━

"text" must be:
- ONLY ONE short paragraph
- Maximum 60-90 words
- Warm, human, emotional
- Friendly local-business tone
- Natural WhatsApp style
- Easy to read

IMPORTANT:
- No long messages
- No bullet points
- No long formatting
- No exaggerated marketing language
- No corporate tone

AVOID WORDS LIKE:
"elevate"
"unlock"
"revolutionary"
"discover"
"journey"
"delight"
"thrilled"
"premium experience"
"unveiling"

STYLE:
- Sounds like a real shop owner
- Add 2-3 natural emojis maximum
- Mention festival naturally if available
- Mention offer naturally if available
- End with a simple CTA asking users to reply on WhatsApp

━━━━━━━━━━━━━━━━━━━
2. POSTER TEXT RULES
━━━━━━━━━━━━━━━━━━━

"posterText":
- Maximum 3 words
- Very short
- Bold
- Easy typography
- Examples:
  "30% OFF"
  "Festive Sale"
  "Sweet Moments"
  "Diwali Offers"

━━━━━━━━━━━━━━━━━━━
3. FESTIVAL WISH RULES
━━━━━━━━━━━━━━━━━━━

"festivalWish":
- Maximum 4 words
- Warm and festive
- Easy typography
- Examples:
  "Happy Diwali"
  "Celebrate Together"
  "Made With Love"

If no festival exists:
return ""

━━━━━━━━━━━━━━━━━━━
4. IMAGE PROMPT RULES
━━━━━━━━━━━━━━━━━━━

Create a HIGH-END commercial AI photo prompt.

The image must visually reflect:
- business category and specific products/services (e.g., if it is a sweet shop, show delicious Indian laddoos and peda; if it is an electronics shop, show premium gadgets or circuit boards).
- Indian festive mood and theme if a festival exists (represented visually through decorations, e.g. warm glowing diyas, clay lamps, and marigold garlands for Diwali; colorful powders for Holi; festive lights for Christmas).
- warm, inviting local-business feeling that feels authentic and authentic.
- The prompt MUST describe a highly contextual, rich, atmospheric scene that integrates these visual elements naturally.

STYLE:
- Luxury commercial photography
- Premium Instagram/WhatsApp marketing product shot
- Cinematic lighting
- Rich colors
- Professional composition
- Realistic details
- Clean modern advertising aesthetic

LAYOUT:
- Product/business should be main focus
- Keep clean negative space
- No clutter

VERY IMPORTANT TEXT/TYPOGRAPHY RULES:
- The image MUST NOT contain any text, letters, words, logo, typography, or overlays.
- It must be a clean, text-free commercial photograph.
- Include this EXACT instruction: "strictly text-free, clean product photography, no written text, no typography, no labels, no spelling errors, no gibberish letters, no text overlay."

The final image should look like a professionally shot social media advertisement for WhatsApp and Instagram.
`;

  try {
    let rawText = "";

    if (geminiKey) {
      // Try multiple model and API version combinations to ensure success
      const attempts = [
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          model: "gemini-2.5-flash (v1beta)"
        },
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          model: "gemini-2.0-flash (v1beta)"
        },
        {
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
          model: "gemini-flash-latest (v1beta)"
        },
        {
          url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          model: "gemini-1.5-flash (v1)"
        }
      ];

      let lastError = null;
      for (const attempt of attempts) {
        try {
          console.log(`Attempting Gemini generation using ${attempt.model}...`);
          const response = await fetch(attempt.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }]
            })
          });
          const data = await response.json();
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            rawText = data.candidates[0].content.parts[0].text;
            console.log(`Success with ${attempt.model}!`);
            break;
          } else {
            lastError = data.error?.message || `Status ${response.status}`;
            console.warn(`Failed ${attempt.model}: ${lastError}`);
          }
        } catch (err) {
          lastError = err.message;
          console.warn(`Error on ${attempt.model}: ${err.message}`);
        }
      }

      if (!rawText) {
        throw new Error(`Gemini API failed all attempts. Last error: ${lastError}`);
      }
    } else if (openaiKey) {
      // Use OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: systemPrompt }]
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "OpenAI API error");
      }
      rawText = data.choices?.[0]?.message?.content || "";
    }

    // Robust parsing of JSON payload
    let generatedText = "";
    let customImagePrompt = "";

    rawText = rawText.trim();
    const cleanJsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanJsonString);
      generatedText = parsed.text;
      customImagePrompt = parsed.imagePrompt;
    } catch (parseErr) {
      // RegEx fallback
      const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          generatedText = parsed.text;
          customImagePrompt = parsed.imagePrompt;
        } catch (matchErr) {
          console.error("JSON fallback parsing failed:", matchErr);
        }
      }
    }

    // Ultimate fallback if parsing failed completely
    if (!generatedText) {
      generatedText = rawText;
    }

    let finalImagePrompt = customImagePrompt;
    if (!finalImagePrompt) {
      // Fallback template
      finalImagePrompt = `A premium marketing poster for ${businessDescription.toLowerCase().slice(0, 80)}${festival ? `, ${festival.toLowerCase()} themed` : ""}. Professional product photography, highly detailed, clean design.`;
    }

    const seed = Math.floor(Math.random() * 100000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalImagePrompt)}?width=800&height=800&nologo=true&seed=${seed}`;

    // Return a proxy URL so the frontend fetches via our server (avoids CORS)
    const imageUrl = `/api/proxy-image?url=${encodeURIComponent(pollinationsUrl)}`;

    res.json({
      text: generatedText,
      imageUrl: imageUrl
    });
  } catch (err) {
    console.error("AI Generation Error:", err.message);
    res.status(500).json({ error: `AI Generation failed: ${err.message}` });
  }
});

// ── Image Proxy (avoids CORS issues on web) ───────────────────────
app.get("/api/proxy-image", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Missing url param" });

  try {
    console.log(`[Proxy] Fetching image: ${targetUrl.slice(0, 100)}...`);
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'image/*' },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[Proxy] Upstream returned ${response.status}`);
      return res.status(502).json({ error: `Image service returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream the response body to the client
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
    console.log(`[Proxy] Image served (${Math.round(arrayBuffer.byteLength / 1024)} KB)`);
  } catch (err) {
    console.error("[Proxy] Error:", err.message);
    res.status(502).json({ error: `Image proxy failed: ${err.message}` });
  }
});



// ── Auth Endpoints ─────────────────────────────────────────────────

app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    if (dbConnected) {
      // MongoDB path
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ error: "Account already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || "",
      });

      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Account created",
        token,
        user: { id: user._id, email: user.email, name: user.name },
      });
    } else {
      // JSON fallback
      const users = loadUsers();
      if (users.find(u => u.email === email.toLowerCase())) {
        return res.status(409).json({ error: "Account already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      users.push({
        id,
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || "",
        createdAt: new Date().toISOString(),
      });
      saveUsers(users);

      const token = jwt.sign(
        { id, email: email.toLowerCase() },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Account created",
        token,
        user: { id, email: email.toLowerCase(), name: name || "" },
      });
    }
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed: " + err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    if (dbConnected) {
      // MongoDB path
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ error: "Invalid email or password" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email, name: user.name },
      });
    } else {
      // JSON fallback
      const users = loadUsers();
      const user = users.find(u => u.email === email.toLowerCase());
      if (!user) return res.status(401).json({ error: "Invalid email or password" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    }
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
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
      status: msg.status || (group === 'complaints' ? 'Open' : group === 'inquiries' ? 'Not Answered' : group === 'orders' ? 'Pending' : null),
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
  const actualCat = catMap[category] || "invalid";
  const catDefaultStatuses = { order: "Pending", complaint: "Open", inquiry: "Not Answered", feedback: null, invalid: null };
  const finalStatus = status !== undefined ? status : catDefaultStatuses[actualCat];
  
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    from: "manual_app",
    name: "App User",
    message: name,
    category: actualCat,
    confidence: 1,
    source: "manual",
    status: finalStatus,
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

  // Also update MongoDB
  if (dbConnected) {
    try {
      const updates = {};
      if (name !== undefined) updates.message = name;
      if (status !== undefined) updates.status = status;
      await Message.findOneAndUpdate({ id: id }, updates);
    } catch (err) {
      console.error("MongoDB category update error:", err.message);
    }
  }

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
  
  // Update JSON file
  const messages = loadMessages();
  const msg = messages.find(m => m.id === id);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  
  msg.status = status;
  msg.statusUpdatedAt = new Date().toISOString();
  saveMessages(messages);

  // Also update MongoDB
  if (dbConnected) {
    try {
      await Message.findOneAndUpdate(
        { id: id },
        { status: status, statusUpdatedAt: new Date().toISOString() }
      );
    } catch (err) {
      console.error("MongoDB status update error:", err.message);
    }
  }

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

app.get("/api/profile", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email query param required" });

  try {
    if (dbConnected) {
      const user = await User.findOne({ email: email.toString().toLowerCase() });
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ name: user.name || "", email: user.email });
    } else {
      const users = loadUsers();
      const user = users.find(u => u.email === email.toString().toLowerCase());
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ name: user.name || "", email: user.email });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/profile", async (req, res) => {
  const { email, name, newEmail } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    if (dbConnected) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ error: "User not found" });
      if (name !== undefined) user.name = name;
      if (newEmail) user.email = newEmail.toLowerCase();
      await user.save();
      return res.json({ success: true });
    } else {
      const users = loadUsers();
      const user = users.find(u => u.email === email.toLowerCase());
      if (!user) return res.status(404).json({ error: "User not found" });
      if (name !== undefined) user.name = name;
      if (newEmail) user.email = newEmail.toLowerCase();
      saveUsers(users);
      return res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
