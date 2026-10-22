# Preview (Ready) 
https://gmailsenderapi.vercel.app/api
Fork To Use, deploy in vercell 

# Email Sender Tutorial

Send emails automatically through your own sender API, using a Gmail App Password.
Works from a simple web page (`settings.html`), from any script, or from a WhatsApp bot.

> This guide assumes your sender API is already online and its `API_KEY` is already set.

---

## How It Works

```
settings.html / bot  ──►  Sender API  ──►  Gmail  ──►  Recipient
 (holds your settings)    (checks API key)
```

1. Your client (`settings.html` or a bot) holds your settings: API URL, API key, Gmail address and App Password.
2. When you send, the client posts everything to the sender API in one request.
3. The sender API checks the API key. If it matches, it logs in to Gmail with the credentials from the request and sends the email.
4. The result (`ok: true` or an error) is returned to the client.

**Who stores what**

| Part | Stores |
|------|--------|
| Sender API | Only the API key (`API_KEY`) |
| Client (`settings.html` / `settings.json`) | API URL, API key, Gmail, App Password, sender name, default recipient |

The sender API does not store your Gmail or App Password. They are used only for the single request.

---

## Files

| File | Purpose |
|------|---------|
| `settings.html` | Simple black web page: Settings tab and Send tab |
| `settings.json` | Your settings in a file (for bots, scripts, or import/export) |

---

## Step 1: Create a Gmail App Password

1. Turn on **2-Step Verification**: https://myaccount.google.com/security
2. Open https://myaccount.google.com/apppasswords
3. Create a new App Password (any name, e.g. `Email Sender`).
4. Copy the 16-character password. Spaces are ignored.

Use this password, not your normal Gmail password.

---

## Step 2: Fill in the Settings

You can use either `settings.html` or `settings.json`.

### Option A: `settings.html`

1. Open `settings.html` in your browser (double click, or host it anywhere).
2. Go to the **Settings** tab and fill in:

| Field | Value |
|-------|-------|
| Sender API URL | `https://YOUR-PROJECT.vercel.app/api/send` |
| API key | Same value as `API_KEY` on your sender |
| Gmail address | `youremail@gmail.com` |
| Google App Password | The 16-character App Password |
| Sender name | Name shown to the recipient (optional) |
| Default recipient | Used when "To" is empty (optional) |

3. Click **Save settings**. They are stored in this browser only.
4. **Export settings.json** downloads your settings as a file. **Import settings.json** loads one back.

### Option B: `settings.json`

```json
{
  "apiUrl": "https://YOUR-PROJECT.vercel.app/api/send",
  "apiKey": "YOUR_API_KEY",
  "smtpUser": "youremail@gmail.com",
  "smtpPass": "your app password",
  "fromName": "My App",
  "defaultTo": "target@example.com"
}
```

---

## Step 3: Send an Email

### From `settings.html`

1. Open the **Send** tab.
2. Fill in **To**, **Subject**, and **Message**.
3. Click **Send Email**.
4. The result appears below the button.

Multiple recipients: separate them with commas (maximum 10).

### From the command line (curl)

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "smtp": {
      "user": "youremail@gmail.com",
      "pass": "your app password",
      "fromName": "My App"
    },
    "to": "target@example.com",
    "subject": "Hello",
    "text": "Test email"
  }'
```

### From JavaScript (Node 18+)

```js
const res = await fetch("https://YOUR-PROJECT.vercel.app/api/send", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "YOUR_API_KEY" },
  body: JSON.stringify({
    smtp: { user: "youremail@gmail.com", pass: "your app password", fromName: "My App" },
    to: "target@example.com",
    subject: "Hello",
    html: "<b>Hello</b> from my app"
  })
});
console.log(await res.json());
```

---

## API Reference

**Endpoint:** `POST /api/send`

**Headers**

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `x-api-key` | Your API key (or use `Authorization: Bearer YOUR_API_KEY`) |

**Body**

| Field | Required | Description |
|-------|----------|-------------|
| `smtp.user` | yes | Gmail address |
| `smtp.pass` | yes | Google App Password |
| `smtp.fromName` | no | Sender display name |
| `smtp.host` | no | Default `smtp.gmail.com` |
| `smtp.port` | no | Default `465` |
| `to` | yes | Recipient(s), comma separated, max 10 |
| `subject` | no | Email subject |
| `text` | one of | Plain text body |
| `html` | one of | HTML body |
| `cc`, `bcc`, `replyTo` | no | Extra recipients / reply address |

**Success response**

```json
{ "ok": true, "messageId": "<...>", "accepted": ["target@example.com"] }
```

**Error response**

```json
{ "ok": false, "error": "Invalid or missing API key." }
```

| Status | Meaning |
|--------|---------|
| 200 | Email sent |
| 400 | Missing or invalid field |
| 401 | Wrong or missing API key |
| 405 | Wrong method (use POST) |
| 500 | Sender has no `API_KEY` configured |
| 502 | Gmail rejected the login or sending |

---

## Using It in a WhatsApp Bot

Any bot (Baileys, whatsapp-web.js, etc.) can use the sender. The bot only needs to read `settings.json` and call the API.

### 1. Put `settings.json` in the bot folder

Use the same format as in Step 2, Option B.

### 2. Add this function to your bot (Node 18+, no extra library)

```js
const fs = require("fs");

async function sendEmail(to, subject, text) {
  const s = JSON.parse(fs.readFileSync("./settings.json", "utf8"));
  const r = await fetch(s.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": s.apiKey },
    body: JSON.stringify({
      smtp: { user: s.smtpUser, pass: s.smtpPass, fromName: s.fromName },
      to: to || s.defaultTo,
      subject,
      text,
    }),
  });
  return r.json();
}
```

The file is read on every call, so you can change the App Password or Gmail in `settings.json` without restarting the bot.

### 3. Add a command

Example command: `.email target@mail.com | Subject | Message`

```js
const [to, subject, text] = args.join(" ").split("|").map(s => s.trim());
const res = await sendEmail(to, subject, text);
reply(res.ok ? "Email sent ✅" : "Failed: " + res.error);
```

### 4. Restrict it to admins

Only let your own number use the command, otherwise anyone can send email from your account:

```js
const ADMINS = ["6281234567890@s.whatsapp.net"];
if (!ADMINS.includes(sender)) return reply("Not allowed.");
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Invalid or missing API key` | The API key in your settings must match the sender's `API_KEY` exactly. If you just changed `API_KEY` on the sender, make sure it was redeployed. |
| `Sender has no API_KEY configured` | `API_KEY` is not set on the sender. |
| `smtp.user and smtp.pass are required` | Gmail address or App Password is empty in your settings. |
| `Failed to send email` with login error | Wrong App Password, or 2-Step Verification is off. Create a new App Password. |
| `Network error` | The Sender API URL is wrong. It must end with `/api/send`. |
| Page loads but nothing saves | Your browser blocks storage. Use **Export settings.json** instead. |
| Email lands in spam | Normal for automated mail. Mark it as "Not spam" and avoid spammy wording. |

---

## Security Notes

- Treat `settings.json` like a password. It contains your App Password and API key.
- Never upload `settings.json` to a public repository. Add it to `.gitignore`:
  ```
  settings.json
  ```
- Do not share `settings.html` after saving settings on a shared computer. Settings are kept in that browser.
- If your API key leaks, change `API_KEY` on the sender and update your settings.
- If your App Password leaks, delete it at https://myaccount.google.com/apppasswords and create a new one.
- Free Gmail accounts can send around 500 emails per day.
