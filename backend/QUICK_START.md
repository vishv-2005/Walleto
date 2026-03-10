# 🚀 Quick Start Guide - WhatsApp Message Extractor

## 🎯 Goal: Extract WhatsApp Messages & Show Categorized Output

### Step 1: Run Setup Script
```bash
cd E:\Semester\Walleto\backend
node setup_whatsapp.js
```
This will guide you through getting credentials and setting up .env file.

### Step 2: Start the Server
```bash
node simple_server.js
```
You should see:
```
🚀 Simple WhatsApp Message Extractor running on http://localhost:5000
📱 Webhook URL: [your webhook URL]
🌐 Visit http://localhost:5000 to see messages
```

### Step 3: Visit Web Interface
Open your browser and go to: **http://localhost:5000**

You'll see a clean interface showing:
- ✅ Server status
- 📨 Received messages
- 🎯 Categorization results
- 🔄 Auto-refresh every 5 seconds

### Step 4: Send WhatsApp Message
1. Send any WhatsApp message to your business number
2. Watch it appear on the web interface
3. See automatic categorization (order/complaint/inquiry/invalid)

### Step 5: Manual Testing (Optional)
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = @{ message = "I want to order a pizza" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/categorize" -Method POST -Headers $headers -Body $body
```

## 📱 What You'll See

### Web Interface Shows:
- **From:** Phone number
- **Message:** Original text
- **Category:** order/complaint/inquiry/invalid
- **Confidence:** Accuracy percentage
- **Time:** When received
- **Color coding:** Green for order, Red for complaint, Blue for inquiry

### Console Output Shows:
```
📱 Message from +1234567890: I want to order a pizza
🎯 Categorized: {
  "from": "+1234567890",
  "message": "I want to order a pizza",
  "category": "order",
  "confidence": 1.0,
  "source": "rule",
  "timestamp": "2/17/2026, 4:30:00 PM"
}
```

## 🔄 Daily Token Refresh

If your token expires:
1. Go to Meta developers → Your app → WhatsApp → API Setup
2. Generate new access token
3. Update .env file: `META_ACCESS_TOKEN=new_token_here`
4. Restart server: `node simple_server.js`

## 🎯 Success Indicators

✅ **Working when:**
- Server starts without errors
- Web interface loads at http://localhost:5000
- Webhook verification succeeds
- WhatsApp messages appear on web interface
- Messages are categorized correctly

## 🆘 Troubleshooting

**Server won't start:**
- Check if port 5000 is free
- Verify .env file exists
- Install dependencies: `npm install`

**Webhook verification fails:**
- Check META_VERIFY_TOKEN matches in Meta dashboard
- Ensure ngrok is running if using it
- Verify webhook URL is correct

**No messages received:**
- Check you're subscribed to "messages" field
- Verify you're messaging the correct WhatsApp number
- Check server console for errors

**Categorization fails:**
- Ensure Python model is trained: `cd ../CatMod && python train_model.py`
- Check categorize.py exists in backend folder
- Verify Python dependencies are installed

## 🏆 You're Done!

When you see messages appearing on the web interface with proper categorization, your WhatsApp message extractor is working perfectly! 🎉
