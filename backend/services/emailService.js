import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email, name, token) {

  const verifyUrl = `http://localhost:3000/api/auth/verify?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Verifica tu cuenta en goTogether",
    html: `
      <h1>Hola ${name}</h1>
      <p>Haz click para verificar tu cuenta</p>
      <a href="${verifyUrl}">Verificar cuenta</a>
    `
  });

}