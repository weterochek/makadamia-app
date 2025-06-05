const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Makadamia" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Письмо отправлено на ${to}`);
    console.log(`📧 Ответ сервера: ${info.response}`);
  } catch (error) {
    console.error("❌ Ошибка отправки письма:", error);
  }
};

module.exports = sendEmail;
