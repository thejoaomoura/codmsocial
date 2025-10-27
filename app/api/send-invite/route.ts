import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend("re_HFvxoke2_6tPaQC1rL5PV3J5Gxuff8SUZ");

export async function POST(req: NextRequest) {
  try {
    const {
      invitedEmail,
      organizationName,
      organizationLogo,
      inviterName,
      message,
      inviteUrl,
    } = await req.json();

    // Validação básica
    if (!invitedEmail || !organizationName) {
      return NextResponse.json(
        { error: "Email e nome da organização são obrigatórios" },
        { status: 400 },
      );
    }

    // Template de e-mail HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convite para ${organizationName}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 0;">
            <tr>
              <td align="center">
                <!-- Container Principal -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      ${
                        organizationLogo
                          ? `
                        <img src="${organizationLogo}" alt="${organizationName}" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid #ffffff; margin-bottom: 20px; object-fit: cover;">
                      `
                          : ""
                      }
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                        Você foi convidado!
                      </h1>
                      <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
                        ${inviterName || "Um membro"} está te convidando para se juntar
                      </p>
                    </td>
                  </tr>

                  <!-- Conteúdo -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <h2 style="color: #1a202c; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">
                          ${organizationName}
                        </h2>
                        <p style="color: #4a5568; margin: 0; font-size: 16px; line-height: 1.6;">
                          Você foi convidado para fazer parte desta organização incrível! 🎉
                        </p>
                      </div>

                      ${
                        message
                          ? `
                        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                          <p style="color: #2d3748; margin: 0 0 5px 0; font-weight: 600; font-size: 14px;">
                            💬 Mensagem pessoal:
                          </p>
                          <p style="color: #4a5568; margin: 0; font-size: 15px; line-height: 1.6; font-style: italic;">
                            "${message}"
                          </p>
                        </div>
                      `
                          : ""
                      }

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${inviteUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                          Aceitar Convite
                        </a>
                      </div>

                      <div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #742a2a; margin: 0; font-size: 13px; line-height: 1.6;">
                          ⚠️ <strong>Importante:</strong> Este convite é válido por 7 dias. Se você não tem uma conta ainda, crie uma usando este mesmo e-mail para aceitar o convite automaticamente.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #718096; margin: 0 0 10px 0; font-size: 14px;">
                        <strong>CODM Social</strong> - Sua rede Social Gamer
                      </p>
                      <p style="color: #a0aec0; margin: 0; font-size: 12px;">
                        Este é um e-mail automático, por favor não responda.
                      </p>
                      <div style="margin-top: 20px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}" style="color: #667eea; text-decoration: none; font-size: 13px; margin: 0 10px;">
                          Acessar Plataforma
                        </a>
                        <span style="color: #cbd5e0;">•</span>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/ajuda" style="color: #667eea; text-decoration: none; font-size: 13px; margin: 0 10px;">
                          Central de Ajuda
                        </a>
                      </div>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Enviar e-mail usando Resend
    const { data, error } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL || "CODM Social <onboarding@resend.dev>",
      to: [invitedEmail],
      subject: `🎉 Você foi convidado para ${organizationName}!`,
      html: emailHtml,
    });

    // Verificar se houve erro no envio
    if (error) {
      console.error("Erro do Resend:", error);

      return NextResponse.json(
        { error: "Erro ao enviar e-mail de convite", details: error },
        { status: 400 },
      );
    }

    console.log("✅ E-mail enviado com sucesso:", data);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);

    return NextResponse.json(
      { error: "Erro ao enviar e-mail de convite", details: error },
      { status: 500 },
    );
  }
}
