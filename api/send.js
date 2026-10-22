const nodemailer = require("nodemailer");
const crypto = require("crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function getKey(req) {
  const h = req.headers;
  if (h["x-api-key"]) return h["x-api-key"];
  const a = h["authorization"] || "";
  return a.toLowerCase().startsWith("bearer ") ? a.slice(7).trim() : "";
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST." });

  // 1) API key (the only thing stored on this sender)
  const keys = (process.env.API_KEY || "").split(",").map((k) => k.trim()).filter(Boolean);
  if (!keys.length) return res.status(500).json({ ok: false, error: "Sender has no API_KEY configured." });
  const provided = getKey(req);
  if (!provided || !keys.some((k) => safeEqual(provided, k))) {
    return res.status(401).json({ ok: false, error: "Invalid or missing API key." });
  }

  // 2) Settings come from the client's request, nothing is stored here
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const smtp = body.smtp || {};

  if (!smtp.user || !smtp.pass) {
    return res.status(400).json({ ok: false, error: "smtp.user and smtp.pass are required (from your settings)." });
  }
  const recipients = String(body.to || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!recipients.length || recipients.length > 10 || !recipients.every((r) => EMAIL_RE.test(r))) {
    return res.status(400).json({ ok: false, error: "Invalid recipient (max 10 valid emails)." });
  }
  if (!body.text && !body.html) {
    return res.status(400).json({ ok: false, error: "Provide 'text' or 'html'." });
  }

  const port = Number(smtp.port) || 465;
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: smtp.user, pass: String(smtp.pass).replace(/\s+/g, "") },
    });
    const name = String(smtp.fromName || "Notifier").replace(/["<>]/g, "");
    const info = await transporter.sendMail({
      from: `"${name}" <${smtp.user}>`,
      to: recipients,
      cc: body.cc,
      bcc: body.bcc,
      replyTo: body.replyTo,
      subject: body.subject || "(no subject)",
      text: body.text,
      html: body.html,
    });
    return res.status(200).json({ ok: true, messageId: info.messageId, accepted: info.accepted });
  } catch (err) {
    return res.status(502).json({ ok: false, error: "Failed to send email.", detail: err.message });
  }
};
