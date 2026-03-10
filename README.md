# Walleto — WhatsApp Message Categorizer

Automatically categorize WhatsApp messages into **Order**, **Inquiry**, **Complaint**, **Feedback**, or **Invalid** — with a live dashboard for business owners.

```
Customer WhatsApp → Meta API → Webhook → Node.js → Python ML → Dashboard
```

## Quick Start

### 1. Install Dependencies

```bash
# Backend (Node.js)
cd backend && npm install

# ML Model (Python)
cd CatMod && pip install -r requirements.txt
```

### 2. Train the Model

```bash
cd CatMod
python main.py
```

### 3. Configure `.env`

Edit `backend/.env` with your Meta credentials:

```env
META_APP_SECRET=your_app_secret
META_VERIFY_TOKEN=walleto_verify_token
META_ACCESS_TOKEN=your_temporary_token   # ← refresh this when expired
META_PHONE_NUMBER_ID=your_phone_number_id
PORT=5000
```

> **Token Refresh**: The temporary access token from Meta expires every ~24 hours.  
> Just paste a new one in `.env` and restart the server.

### 4. Start the Server

```bash
cd backend
node server.js
```

Open **http://localhost:5000** to see the dashboard.

### 5. Connect WhatsApp (with ngrok)

```bash
ngrok http 5000
```

Then in [Meta Developers Dashboard](https://developers.facebook.com/):
1. Go to your App → WhatsApp → Configuration
2. Set **Callback URL**: `https://your-ngrok-url.ngrok-free.dev/webhook`
3. Set **Verify Token**: `walleto_verify_token` (must match `.env`)
4. Subscribe to the **messages** field

## Project Structure

```
Walleto/
├── CatMod/                     # ML Categorization Model
│   ├── training_data.py        # Training examples (5 categories)
│   ├── main.py                 # Train & save model
│   ├── predict.py              # Predict category from message
│   ├── models/                 # Saved model files
│   └── requirements.txt
├── backend/                    # Node.js Server
│   ├── server.js               # Main server (webhook + API + dashboard)
│   ├── categorize.py           # Python bridge for Node.js
│   ├── public/                 # Dashboard UI
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   ├── data/                   # Stored messages (JSON)
│   ├── .env                    # Your credentials (don't commit!)
│   └── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Dashboard UI |
| GET | `/webhook` | Meta webhook verification |
| POST | `/webhook` | Receive WhatsApp messages |
| POST | `/categorize` | Manual categorization (`{ "message": "..." }`) |
| GET | `/api/messages` | All stored messages |
| GET | `/api/stats` | Category counts |
| DELETE | `/api/messages` | Clear all messages |

## Categories

| Category | Description | Dashboard Color |
|----------|-------------|-----------------|
| 🛒 Order | Purchase/delivery requests | Green |
| ❓ Inquiry | Questions about price, stock, etc. | Blue |
| ⚠️ Complaint | Negative feedback, issues | Red |
| 💬 Feedback | Positive feedback, appreciation | Yellow |
| 🚫 Invalid | Gibberish, spam, unrelated | Gray |

## Troubleshooting

- **Model not found**: Run `cd CatMod && python main.py` to train first
- **Webhook fails**: Ensure `META_VERIFY_TOKEN` in `.env` matches what you set in Meta
- **Token expired**: Get new token from Meta dashboard → update `.env` → restart server
