import { createHash, randomBytes } from "crypto";

export type EmailVerificationMessage = {
  to: string;
  username: string;
  token: string;
};

export function createEmailVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function emailVerificationExpiry(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

function configuredProvider() {
  const provider = String(process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const apiKey = process.env.EMAIL_API_KEY || process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || "";
  const from = process.env.EMAIL_FROM || "";
  const required = process.env.EMAIL_VERIFICATION_REQUIRED === "1";
  return { provider, apiKey, from, required };
}

function baseUrl(): string {
  return String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

function sender(from: string): { email: string; name?: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  return match ? { name: match[1].trim(), email: match[2].trim() } : { email: from.trim() };
}

function verificationHtml(message: EmailVerificationMessage, link: string): string {
  const safeName = message.username.replace(/[<>]/g, "");
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#100d08;color:#f7f0df;font-family:Arial,sans-serif;padding:32px"><main style="max-width:560px;margin:auto;border:1px solid #80651d;border-radius:20px;background:#1d160a;padding:28px;text-align:center"><h1 style="color:#f1c84b;margin:0 0 12px">تأكيد بريدك الإلكتروني</h1><p style="line-height:1.8;color:#d9cfbd">مرحبًا ${safeName}، اضغط الزر التالي لتأكيد بريدك وإكمال حماية حسابك.</p><p><a href="${link}" style="display:inline-block;background:#e4b92f;color:#171107;text-decoration:none;font-weight:700;border-radius:10px;padding:13px 24px">تأكيد البريد</a></p><p style="font-size:12px;color:#9d927f">صلاحية الرابط 30 دقيقة. إذا لم تطلب إنشاء هذا الحساب فتجاهل الرسالة.</p></main></body></html>`;
}

export async function sendEmailVerification(message: EmailVerificationMessage): Promise<{ sent: boolean; configured: boolean }> {
  const { provider, apiKey, from, required } = configuredProvider();
  const appUrl = baseUrl();
  if (!provider || !apiKey || !from || !appUrl) return { sent: false, configured: false };

  const link = `${appUrl}/verify-email?token=${encodeURIComponent(message.token)}`;
  const subject = "تأكيد بريدك الإلكتروني في follower";
  const html = verificationHtml(message, link);
  let response: Response;

  if (provider === "brevo") {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: sender(from), to: [{ email: message.to, name: message.username }], subject, htmlContent: html }),
    });
  } else if (provider === "resend") {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject, html }),
    });
  } else {
    return { sent: false, configured: false };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Email verification provider rejected the message", { provider, status: response.status, errorLength: errorText.length });
    if (required) throw new Error("EMAIL_PROVIDER_FAILED");
    return { sent: false, configured: true };
  }

  return { sent: true, configured: true };
}

export function emailVerificationRequired(): boolean {
  return configuredProvider().required;
}

export function emailVerificationConfigured(): boolean {
  const { provider, apiKey, from } = configuredProvider();
  return ["brevo", "resend"].includes(provider) && Boolean(apiKey && from && baseUrl());
}
