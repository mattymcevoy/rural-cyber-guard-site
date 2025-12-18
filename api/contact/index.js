// api/contact/index.js

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
    return;
  }

  try {
    const body = req.body || {};

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const message = (body.message || "").trim();
    const company = (body.company || "").trim(); // honeypot (optional)
    const source = (body.source || "website").trim();

    // Honeypot spam trap: silently accept, do nothing
    if (company) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: { ok: true }
      };
      return;
    }

    // Basic validation
    if (!name || !email || !message) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: { error: "Missing required fields (name, email, message)." }
      };
      return;
    }

    // Always log the enquiry (useful while Postmark is being sorted)
    context.log("New contact enquiry:", {
      name,
      email,
      phone,
      message: message.slice(0, 500),
      source,
      receivedAt: new Date().toISOString()
    });

    // Postmark config
    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
    const toEmail = process.env.CONTACT_TO_EMAIL;       // e.g. matt.mcevoy@ctoservices.co.uk
    const fromEmail = process.env.CONTACT_FROM_EMAIL;   // must be verified in Postmark

    // If Postmark not configured yet, succeed gracefully
    if (!postmarkToken || !toEmail || !fromEmail) {
      context.log.warn("Postmark not configured (missing env vars). Returning OK without sending email.");
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: { ok: true, sent: false }
      };
      return;
    }

    const subject = `Rural Cyber Guard enquiry from ${name}`;
    const textBody =
      `New website enquiry (Rural Cyber Guard)\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone || "-"}\n` +
      `Source: ${source}\n` +
      `Time: ${new Date().toISOString()}\n\n` +
      `Message:\n${message}\n`;

    // Send via Postmark
    const pmRes = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken
      },
      body: JSON.stringify({
        From: fromEmail,
        To: toEmail,
        ReplyTo: email, // so you can reply directly to the user
        Subject: subject,
        TextBody: textBody,
        MessageStream: "outbound"
      })
    });

    const pmText = await pmRes.text();

    if (!pmRes.ok) {
      context.log.error("Postmark error:", pmRes.status, pmText);
      // Keep the UX friendly: return OK so your site shows success, but log failure
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: { ok: true, sent: false }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: { ok: true, sent: true }
    };
  } catch (err) {
    context.log.error("Contact function error:", err.message || err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: { error: "Server error processing contact request." }
    };
  }
};

