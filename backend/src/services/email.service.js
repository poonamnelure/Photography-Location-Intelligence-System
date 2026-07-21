import nodemailer from "nodemailer";

// ── SMTP transporter (lazy-init on first send) ──────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[EmailService] SMTP_USER / SMTP_PASS not set — emails disabled.");
    return null;
  }

  console.log(`[EmailService] Initializing SMTP: ${host}:${port} as ${user}`);

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

function getFrom() {
  return process.env.SMTP_FROM || '"LensIQ" <noreply@lensiq.app>';
}

// ── Shared HTML wrapper ─────────────────────────────────────────────────────
function wrap(bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#131315;border:1px solid rgba(200,169,110,0.18);border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1814 0%,#131315 100%);padding:28px 32px 20px;border-bottom:1px solid rgba(200,169,110,0.12);">
      <h1 style="margin:0;font-size:22px;font-weight:400;color:#c8a96e;letter-spacing:0.04em;">
        Lens<em style="font-style:italic;">IQ</em>
      </h1>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${bodyHtml}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.3);letter-spacing:0.06em;">
        © 2026 LensIQ — Photography Location Intelligence
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Schedule Confirmation Email (sent immediately when user schedules) ──────
export async function sendScheduleConfirmation({ to, placeName, scheduledDate, photographyType }) {
  const t = getTransporter();
  if (!t) return;

  const dateStr = new Date(scheduledDate).toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = new Date(scheduledDate).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#f0ede8;font-weight:500;">
      ✓ Visit Scheduled!
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:rgba(240,237,232,0.55);">
      Your photography visit has been confirmed.
    </p>

    <div style="background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.15);border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:16px;color:#f0ede8;font-weight:500;">${placeName}</p>
      <p style="margin:0 0 4px;font-size:12px;color:rgba(240,237,232,0.5);">📷 ${photographyType || "Photography"}</p>
      <p style="margin:0 0 4px;font-size:12px;color:rgba(240,237,232,0.5);">📅 ${dateStr}</p>
      <p style="margin:0;font-size:12px;color:rgba(240,237,232,0.5);">⏰ ${timeStr}</p>
    </div>

    <p style="margin:0;font-size:13px;color:rgba(240,237,232,0.55);line-height:1.7;">
      We'll send you a reminder on the day of your visit.
      Have a great shoot! 📸
    </p>
  `;

  try {
    await t.sendMail({
      from: getFrom(),
      to,
      subject: `✓ Visit Scheduled: ${placeName} — ${dateStr}`,
      html: wrap(body),
    });
    console.log(`[Email] Schedule confirmation sent to ${to} for ${placeName}`);
  } catch (err) {
    console.error("[Email] Failed to send schedule confirmation:", err.message);
  }
}

// ── Visit Reminder Email (sent by cron on the day of visit) ─────────────────
export async function sendVisitReminder({ to, placeName, scheduledDate, photographyType }) {
  const t = getTransporter();
  if (!t) return;

  const dateStr = new Date(scheduledDate).toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#f0ede8;font-weight:500;">
      📅 Visit Reminder
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:rgba(240,237,232,0.55);">
      You have a photography visit scheduled for today.
    </p>

    <div style="background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.15);border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:16px;color:#f0ede8;font-weight:500;">${placeName}</p>
      <p style="margin:0 0 4px;font-size:12px;color:rgba(240,237,232,0.5);">📷 ${photographyType || "Photography"}</p>
      <p style="margin:0;font-size:12px;color:rgba(240,237,232,0.5);">📅 ${dateStr}</p>
    </div>

    <p style="margin:0;font-size:13px;color:rgba(240,237,232,0.55);line-height:1.7;">
      Have a great shoot! Don't forget to check weather conditions before heading out.
      After your visit, we'd love to hear about your experience.
    </p>
  `;

  try {
    await t.sendMail({
      from: getFrom(),
      to,
      subject: `📅 Reminder: Your visit to ${placeName} is today!`,
      html: wrap(body),
    });
    console.log(`[Email] Visit reminder sent to ${to} for ${placeName}`);
  } catch (err) {
    console.error("[Email] Failed to send visit reminder:", err.message);
  }
}

// ── Review Request Email ────────────────────────────────────────────────────
export async function sendReviewRequest({ to, placeName, photographyType }) {
  const t = getTransporter();
  if (!t) return;

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#f0ede8;font-weight:500;">
      ⭐ How was your visit?
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:rgba(240,237,232,0.55);">
      You recently visited <strong style="color:#c8a96e;">${placeName}</strong> for ${photographyType || "photography"}.
      We'd love to hear about your experience!
    </p>

    <div style="background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.15);border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 12px;font-size:28px;">⭐ ⭐ ⭐ ⭐ ⭐</p>
      <p style="margin:0;font-size:13px;color:rgba(240,237,232,0.55);">
        Rate and review this location on LensIQ
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:rgba(240,237,232,0.55);line-height:1.7;">
      Your feedback helps other photographers discover great locations.
      Log in to LensIQ to share your review.
    </p>
  `;

  try {
    await t.sendMail({
      from: getFrom(),
      to,
      subject: `⭐ How was your visit to ${placeName}?`,
      html: wrap(body),
    });
    console.log(`[Email] Review request sent to ${to} for ${placeName}`);
  } catch (err) {
    console.error("[Email] Failed to send review request:", err.message);
  }
}

// ── Password Reset Email ────────────────────────────────────────────────────
export async function sendPasswordReset({ to, resetLink }) {
  const t = getTransporter();
  if (!t) {
    console.warn("[EmailService] SMTP not configured — logging reset link to console.");
    console.log(`[Auth] Password reset link for ${to}: ${resetLink}`);
    return;
  }

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#f0ede8;font-weight:500;">
      🔑 Reset Your Password
    </h2>
    <p style="margin:0 0 20px;font-size:13px;color:rgba(240,237,232,0.55);">
      We received a request to reset the password for your LensIQ account.
      Click the button below to set a new password. This link expires in <strong style="color:#c8a96e;">15 minutes</strong>.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#c8a96e 0%,#a07840 100%);color:#0a0800;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:8px;">
        Reset Password
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:12px;color:rgba(240,237,232,0.35);line-height:1.6;">
      If you didn't request this, you can safely ignore this email — your password will not change.
    </p>
    <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.2);word-break:break-all;">
      Or copy this link: ${resetLink}
    </p>
  `;

  try {
    await t.sendMail({
      from: getFrom(),
      to,
      subject: `🔑 Reset your LensIQ password`,
      html: wrap(body),
    });
    console.log(`[Email] Password reset email sent to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send password reset email:", err.message);
  }
}
