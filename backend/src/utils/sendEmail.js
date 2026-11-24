import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log(
      `\n[EMAIL - chưa cấu hình MAIL_USER/MAIL_PASS]\nTới: ${to}\nChủ đề: ${subject}\n${text}\n`,
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });

  await transporter.sendMail({
    from: `"Unitas" <${process.env.MAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
