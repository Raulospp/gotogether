import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const PORT   = process.env.PORT || 3000;

export async function sendVerificationEmail(email, name, token) {
  const baseUrl    = process.env.APP_URL || `http://localhost:${PORT}`;
  const verifyUrl  = `${baseUrl}/api/auth/verify?token=${token}`;

  await resend.emails.send({
    from:    'onboarding@resend.dev',
    to:      email,
    subject: 'Verifica tu cuenta en goTogether',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#070707;color:#ede9e6;padding:32px;border-radius:16px;">
        <h1 style="font-size:24px;margin-bottom:8px;">Hola, ${name} 👋</h1>
        <p style="color:rgba(237,233,230,.6);margin-bottom:24px;">
          Gracias por registrarte en <strong style="color:#a32020">goTogether</strong>. Solo un paso más:
        </p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#8B1A1A;color:#ede9e6;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Verificar mi cuenta
        </a>
        <p style="color:rgba(237,233,230,.35);font-size:12px;margin-top:24px;">
          Si no creaste esta cuenta, ignora este mensaje.
        </p>
      </div>
    `,
  });
}