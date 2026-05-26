import nodemailer from "nodemailer";

export function isValidEmail(s) {
  if (typeof s !== "string" || !s.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function getSmtpConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  const from =
    process.env.EMAIL_FROM || process.env.SMTP_FROM || user;
  const domain = process.env.EMAIL_DOMAIN;
  const tlsRejectRaw = (
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED ?? ""
  ).toLowerCase();
  const tlsRejectUnauthorized =
    tlsRejectRaw !== "false" &&
    tlsRejectRaw !== "0" &&
    tlsRejectRaw !== "no";

  return {
    host,
    port,
    user,
    pass,
    from,
    domain,
    tlsRejectUnauthorized,
    configured: Boolean(host && user && pass),
  };
}

export function createMailTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    throw new Error(
      "SMTP no configurado. Defina EMAIL_HOST, EMAIL_USER y EMAIL_PASSWORD (o SMTP_*) en el entorno del servidor.",
    );
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
    ...(cfg.domain ? { name: cfg.domain } : {}),
  });
}

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
export async function sendMailMessage(opts) {
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    throw new Error(
      "SMTP no configurado. Defina EMAIL_HOST, EMAIL_USER y EMAIL_PASSWORD (o SMTP_*) en el entorno del servidor.",
    );
  }

  const transporter = createMailTransporter();
  await transporter.sendMail({
    from: `"System V-Docs" <${cfg.from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text || "(Sin contenido)",
    ...(opts.html ? { html: opts.html } : {}),
  });
}
