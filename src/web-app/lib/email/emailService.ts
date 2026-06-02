/**
 * lib/email/emailService.ts
 *
 * Thin email-sending abstraction backed by the Resend API.
 * Falls back gracefully if RESEND_API_KEY is not set (logs only).
 *
 * Usage:
 *   import { sendEmail, buildDigestEmail } from "@/lib/email/emailService";
 *   await sendEmail({ to, subject, html });
 *
 * Resend docs: https://resend.com/docs/api-reference/emails/send-email
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type DigestNotification = {
  type: string;
  required_action: string | null;
  message: string;
  entity_name: string | null;
  action_url: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESEND_URL = "https://api.resend.com/emails";

const TYPE_LABEL: Record<string, string> = {
  payment_ready:       "Release payment",
  approval_required:   "Sign-off needed",
  evidence_required:   "Evidence needed",
  funding_gap:         "Funds short",
  variation_submitted: "Contract change to review",
  dispute_raised:      "Dispute — payment held",
  variation_approved:  "Contract change approved",
  variation_rejected:  "Contract change rejected",
  dispute_resolved:    "Dispute sorted",
  approval_returned:   "Stage returned — action needed",
  approval_rejected:   "Stage rejected",
};

const TYPE_COLOR: Record<string, string> = {
  payment_ready:       "#16a34a",
  approval_required:   "#2563eb",
  evidence_required:   "#d97706",
  funding_gap:         "#dc2626",
  variation_submitted: "#7c3aed",
  dispute_raised:      "#ea580c",
  variation_approved:  "#059669",
  variation_rejected:  "#dc2626",
  dispute_resolved:    "#059669",
  approval_returned:   "#ea580c",
  approval_rejected:   "#dc2626",
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM ?? "noreply@shure.fund";

  if (!apiKey) {
    // Dev/staging without email configured — log only
    console.log("[emailService] RESEND_API_KEY not set — email not sent:", {
      to: msg.to,
      subject: msg.subject,
    });
    return;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from:    fromAddress,
        to:      [msg.to],
        subject: msg.subject,
        html:    msg.html,
        text:    msg.text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[emailService] Resend error:", err);
    }
  } catch (err) {
    // Non-fatal — email failure should never block the main flow
    console.error("[emailService] Network error:", err);
  }
}

// ---------------------------------------------------------------------------
// Digest email builder
// ---------------------------------------------------------------------------

/**
 * Builds a plain-language HTML digest email for one user.
 * Lists each unread notification with its action label, message, and a CTA link.
 */
export function buildDigestEmail(
  recipientName: string,
  notifications: DigestNotification[],
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const actionable = notifications.filter((n) => {
    const label = TYPE_LABEL[n.type];
    return label !== undefined; // anything we have a label for
  });

  const subject = actionable.length === 1
    ? `Action needed: ${TYPE_LABEL[actionable[0].type] ?? actionable[0].type}`
    : `${actionable.length} items need your attention — Shure.Fund`;

  // Build HTML rows
  const rows = notifications.map((n) => {
    const label = TYPE_LABEL[n.type] ?? (n.required_action ?? "Update");
    const color = TYPE_COLOR[n.type] ?? "#94a3b8";
    const url = n.action_url ? `${siteUrl}${n.action_url}` : null;
    const when = fmtDate.format(new Date(n.created_at));

    return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e8eaf0;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;
                    letter-spacing:0.08em;color:${color};">${label}</p>
          ${n.entity_name
            ? `<p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#0d1144;">${escHtml(n.entity_name)}</p>`
            : ""}
          <p style="margin:0 0 8px;font-size:13px;color:#4b5563;line-height:1.5;">
            ${escHtml(n.message)}
          </p>
          <p style="margin:0;font-size:11px;color:#9ca3af;">${when}</p>
          ${url
            ? `<a href="${url}" style="display:inline-block;margin-top:10px;padding:8px 16px;
                background:${color}22;border:1px solid ${color}44;border-radius:8px;
                color:${color};font-size:12px;font-weight:600;text-decoration:none;">
                Sort it →
              </a>`
            : ""}
        </td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:20px;
             border:1px solid #e8eaf0;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#0d1144;padding:24px 28px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Shure.Fund</p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">
              Daily digest for ${escHtml(recipientName)}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:0 28px;">
            <p style="margin:24px 0 16px;font-size:14px;color:#4b5563;">
              You have <strong style="color:#0d1144;">${notifications.length} item${notifications.length !== 1 ? "s" : ""}</strong>
              that need${notifications.length === 1 ? "s" : ""} your attention.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${rows}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 28px;border-top:1px solid #e8eaf0;">
            <a href="${siteUrl}/inbox"
               style="display:inline-block;padding:12px 24px;background:#0d1144;
                      border-radius:10px;color:#fff;font-size:13px;font-weight:600;
                      text-decoration:none;">
              Open inbox →
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">
              You're receiving this because you have unread notifications on Shure.Fund.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Plain-text fallback
  const text = [
    `Shure.Fund digest for ${recipientName}`,
    `You have ${notifications.length} item(s) that need your attention.`,
    "",
    ...notifications.map((n) => {
      const label = TYPE_LABEL[n.type] ?? (n.required_action ?? "Update");
      const url = n.action_url ? `${siteUrl}${n.action_url}` : "";
      return [
        `[${label}] ${n.entity_name ?? ""}`,
        n.message,
        url,
      ].filter(Boolean).join("\n");
    }),
    "",
    `Open inbox: ${siteUrl}/inbox`,
  ].join("\n");

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Transactional email builder — single notification, sent immediately
// ---------------------------------------------------------------------------

/**
 * Builds a focused single-action HTML email for one user.
 * Used for immediate transactional sends (not batched digest).
 */
export function buildTransactionalEmail(
  recipientName: string,
  notification: DigestNotification,
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const label = TYPE_LABEL[notification.type] ?? (notification.required_action ?? "Update");
  const color = TYPE_COLOR[notification.type] ?? "#64748b";
  const url   = notification.action_url ? `${siteUrl}${notification.action_url}` : null;
  const subject = notification.entity_name
    ? `${label} — ${notification.entity_name}`
    : label;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:20px;border:1px solid #e8eaf0;overflow:hidden;">
        <tr>
          <td style="background:#0d1144;padding:24px 28px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Shure.Fund</p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">For ${escHtml(recipientName)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color};">${escHtml(label)}</p>
            ${notification.entity_name
              ? `<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0d1144;">${escHtml(notification.entity_name)}</p>`
              : ""}
            <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">${escHtml(notification.message)}</p>
            ${url
              ? `<a href="${url}" style="display:inline-block;padding:12px 24px;background:#0d1144;border-radius:10px;color:#fff;font-size:13px;font-weight:600;text-decoration:none;">${escHtml(notification.required_action ?? "View")} →</a>`
              : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #e8eaf0;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              You're receiving this because you have a pending action on Shure.Fund. &nbsp;
              <a href="${siteUrl}/inbox" style="color:#0d1144;font-weight:600;">View all notifications →</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Shure.Fund — ${label}`,
    notification.entity_name ?? "",
    notification.message,
    url ?? "",
    `View inbox: ${siteUrl}/inbox`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
