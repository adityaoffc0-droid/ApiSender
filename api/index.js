module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    service: "email-sender",
    note: "Stateless sender. SMTP settings are sent by the client with each request.",
    usage: "POST /api/send  header: x-api-key  body: { smtp:{user,pass,host?,port?,fromName?}, to, subject, text|html }",
  });
};
