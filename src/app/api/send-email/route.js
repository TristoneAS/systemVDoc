import { isValidEmail, sendMailMessage } from "@/libs/mailer";

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
      { status: 400 },
    );
  }
  if (!subject) {
    return Response.json({ error: "El asunto es obligatorio" }, { status: 400 });
  }

  try {
    await sendMailMessage({ to, subject, text });
  } catch (err) {
    const msg =
      err && typeof err.message === "string"
        ? err.message
        : "Error al enviar el correo";
    const status = msg.includes("SMTP no configurado") ? 500 : 502;
    return Response.json({ error: msg }, { status });
  }

  return Response.json({ ok: true, message: "Correo enviado correctamente" });
}
