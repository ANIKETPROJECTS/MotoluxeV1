import nodemailer from "nodemailer";

export const CONTACT_EMAIL = "info@motoluxe.co.in";

type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function getTransporter() {
  const password = process.env.HOSTINGER_SMTP_PASSWORD?.trim();
  if (!password) {
    throw new Error("HOSTINGER_SMTP_PASSWORD is not configured");
  }

  const port = Number(process.env.HOSTINGER_SMTP_PORT ?? "465");
  const user = process.env.HOSTINGER_SMTP_USER?.trim() || CONTACT_EMAIL;

  return {
    user,
    transporter: nodemailer.createTransport({
      host: process.env.HOSTINGER_SMTP_HOST?.trim() || "smtp.hostinger.com",
      port,
      secure: port === 465,
      auth: {
        user,
        pass: password,
      },
    }),
  };
}

export async function sendContactMessage({ name, email, message }: ContactMessage) {
  const { user, transporter } = getTransporter();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br />");

  await transporter.sendMail({
    from: `"Motoluxe Website" <${user}>`,
    to: CONTACT_EMAIL,
    replyTo: email,
    subject: `Website enquiry from ${name}`,
    text: [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    html: `
      <h2>New Motoluxe website enquiry</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
    `,
  });
}
