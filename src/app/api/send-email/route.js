import nodemailer from "nodemailer";

function isValidEmail(s) {
  if (typeof s !== "string" || !s.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text =
    typeof body.text === "string" ? body.text : String(body.text ?? "");

  if (!isValidEmail(to)) {
    return Response.json(
      { error: "El correo del destinatario no es válido" },
      { status: 400 }
    );
  }
  if (!subject) {
    return Response.json({ error: "El asunto es obligatorio" }, { status: 400 });
  }

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(
    process.env.EMAIL_PORT || process.env.SMTP_PORT || 587
  );
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  const from =
    process.env.EMAIL_FROM || process.env.SMTP_FROM || user;
  const domain = process.env.EMAIL_DOMAIN;

  // Servidores internos a veces usan CA propia o cadena incompleta → "unable to verify the first certificate"
  const tlsRejectRaw = (
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED ?? ""
  ).toLowerCase();
  const tlsRejectUnauthorized =
    tlsRejectRaw !== "false" &&
    tlsRejectRaw !== "0" &&
    tlsRejectRaw !== "no";

  if (!host || !user || !pass) {
    return Response.json(
      {
        error:
          "SMTP no configurado. Defina EMAIL_HOST, EMAIL_USER y EMAIL_PASSWORD (o SMTP_*) en el entorno del servidor.",
      },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: tlsRejectUnauthorized,
    },
    ...(domain
      ? {
          name: domain,
        }
      : {}),
  });

  try {
    await transporter.sendMail({
      from: `"System V-Docs" <${from}>`,
      to,
      subject,
      text: text || "(Sin contenido)",
    });
  } catch (err) {
    const msg =
      err && typeof err.message === "string"
        ? err.message
        : "Error al enviar el correo";
    return Response.json({ error: msg }, { status: 502 });
  }

  return Response.json({ ok: true, message: "Correo enviado correctamente" });
}
