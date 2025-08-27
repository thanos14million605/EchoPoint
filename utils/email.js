import dotenv from "dotenv";
dotenv.config({
  path: "./../config.env",
});

import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const transporter = await nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: "Ebrima Gajaga",
    to: options.to,
    subject: options.subject,
    text: options.message,
  });
};

export default sendEmail;
