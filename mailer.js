// backend/mailer.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'SEU_EMAIL@gmail.com',
    pass: 'SENHA_DO_APP_PASSWORD'
  }
});

export const sendVerificationEmail = async (to, token) => {
  const link = `http://localhost:5000/verify-email?token=${token}`;
  
  const mailOptions = {
    from: '"DeckBuilder" <SEU_EMAIL@gmail.com>',
    to,
    subject: "Verify your email",
    html: `<p>Click the link to verify your email:</p>
           <a href="${link}">${link}</a>`
  };

  await transporter.sendMail(mailOptions);
};
