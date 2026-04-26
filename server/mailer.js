import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false', // true para 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"${process.env.SMTP_FROM_NAME || 'Ativa FIX'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

/**
 * Envia email transacional.
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 */
export async function sendMail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });
  console.log('[Mailer] Email enviado:', info.messageId, '→', to);
  return info;
}

/**
 * Envia o email de redefinição de senha.
 * @param {object} opts
 * @param {string} opts.to - email do destinatário
 * @param {string} opts.resetLink - URL completa com o token
 * @param {string} [opts.name] - nome do usuário (opcional)
 */
export async function sendPasswordResetEmail({ to, resetLink, name }) {
  const saudacao = name ? `Olá, ${name}!` : 'Olá!';
  const brandName = process.env.SMTP_FROM_NAME || 'Ativa FIX';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de Senha</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#75c7ad;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${brandName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;color:#334155;">
              <p style="margin:0 0 16px;font-size:16px;">${saudacao}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                Recebemos uma solicitação para redefinir a senha da sua conta.<br />
                Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:999px;background:#75c7ad;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
                Se não foi você que solicitou, ignore este email — sua senha não será alterada.
              </p>
              <p style="margin:0;font-size:12px;color:#cbd5e1;word-break:break-all;">
                Ou acesse: <a href="${resetLink}" style="color:#75c7ad;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
                © ${new Date().getFullYear()} ${brandName}. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendMail({ to, subject: `${brandName} — Redefinição de senha`, html });
}
