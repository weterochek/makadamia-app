const nodemailer = require("nodemailer");

async function sendEmail(to, subject, htmlText) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // укажи в .env файл
        pass: process.env.EMAIL_PASS  // пароль от почты или app password
      }
    });

    await transporter.sendMail({
      from: `"Makadamia" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlText
    });

    console.log("✅ Письмо успешно отправлено на:", to);
  } catch (err) {
    console.error("❌ Ошибка отправки письма:", err);
    throw err;
  }
}

module.exports = sendEmail;
