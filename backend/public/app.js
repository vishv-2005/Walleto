// Walleto Dashboard — app.js
const API = "";
let currentFilter = "all";

// ── Fetch & Render ──
async function fetchStats() {
    try {
        const res = await fetch(`${API}/api/stats`);
        const s = await res.json();
        document.getElementById("statTotal").textContent = s.total;
        document.getElementById("statOrder").textContent = s.order;
        document.getElementById("statInquiry").textContent = s.inquiry;
        document.getElementById("statComplaint").textContent = s.complaint;
        document.getElementById("statFeedback").textContent = s.feedback;
        document.getElementById("statInvalid").textContent = s.invalid;
    } catch (e) {
        console.error("Stats fetch error:", e);
    }
}

async function fetchMessages() {
    try {
        const res = await fetch(`${API}/api/messages`);
        const messages = await res.json();
        renderMessages(messages);
    } catch (e) {
        console.error("Messages fetch error:", e);
    }
}

function renderMessages(messages) {
    const feed = document.getElementById("messagesFeed");
    const empty = document.getElementById("emptyState");

    const filtered = currentFilter === "all"
        ? messages
        : messages.filter(m => m.category === currentFilter);

    if (filtered.length === 0) {
        feed.innerHTML = "";
        const p = document.createElement("p");
        p.className = "empty-state";
        p.id = "emptyState";
        p.textContent = currentFilter === "all"
            ? "No messages yet. Send a WhatsApp message or use the test input above!"
            : `No ${currentFilter} messages.`;
        feed.appendChild(p);
        return;
    }

    feed.innerHTML = filtered.map(m => {
        const time = formatTime(m.timestamp);
        const conf = m.confidence != null ? `${(m.confidence * 100).toFixed(0)}%` : "—";
        return `
      <div class="msg-card">
        <span class="msg-badge badge-${m.category}">${m.category}</span>
        <div class="msg-body">
          <div class="msg-text">${escapeHtml(m.message)}</div>
          <div class="msg-meta">
            <span>👤 ${escapeHtml(m.name || m.from)}</span>
            <span>🕐 ${time}</span>
            <span class="msg-confidence">Confidence: ${conf}</span>
          </div>
        </div>
      </div>`;
    }).join("");
}

function formatTime(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
        return iso;
    }
}

function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
}

// ── Filters ──
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        fetchMessages();
    });
});

// ── Test Message ──
document.getElementById("testBtn").addEventListener("click", sendTest);
document.getElementById("testMessage").addEventListener("keydown", e => {
    if (e.key === "Enter") sendTest();
});

async function sendTest() {
    const input = document.getElementById("testMessage");
    const msg = input.value.trim();
    if (!msg) return;

    input.disabled = true;
    document.getElementById("testBtn").disabled = true;

    try {
        await fetch(`${API}/categorize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
        });
        input.value = "";
        await refresh();
    } catch (e) {
        console.error("Test send error:", e);
    } finally {
        input.disabled = false;
        document.getElementById("testBtn").disabled = false;
        input.focus();
    }
}

// ── Clear ──
document.getElementById("clearBtn").addEventListener("click", async () => {
    if (!confirm("Clear all messages?")) return;
    await fetch(`${API}/api/messages`, { method: "DELETE" });
    await refresh();
});

// ── Auto Refresh ──
async function refresh() {
    await Promise.all([fetchStats(), fetchMessages()]);
}

refresh();
setInterval(refresh, 4000);
