import "server-only";
import nodemailer from "nodemailer";
import { required } from "./db";
export function mailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.MAIL_FROM &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
}
export async function sendAccountMail(
  to: string,
  subject: string,
  text: string,
) {
  if (!mailConfigured()) throw new Error("Mailversand nicht konfiguriert.");
  const port = Number(required("SMTP_PORT"));
  const transport = nodemailer.createTransport({
    host: required("SMTP_HOST"),
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: required("SMTP_USER"), pass: required("SMTP_PASSWORD") },
  });
  await transport.sendMail({ from: required("MAIL_FROM"), to, subject, text });
}
