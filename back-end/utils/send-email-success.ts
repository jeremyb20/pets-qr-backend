import nodemailer from 'nodemailer';
import 'dotenv/config';

export async function sendPasswordChangedConfirmation(
  email: string,
  userName: string
): Promise<void> {
  try {
    // Configurar transporter (usar el mismo que forgotPassword)
    const transporter = nodemailer.createTransport({
      host: process.env.ZOHO_HOST,
      port: parseInt(process.env.ZOHO_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.ZOHO_USER,
        pass: process.env.ZOHO_PASSWORD,
      },
    });

    const mailOptions = {
      to: email,
      from: process.env.EMAIL_FROM || 'soporte@plaquitascr.com',
      subject: 'Contraseña actualizada exitosamente - PlaquitasCR',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
            .warning { color: #d9534f; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Contraseña Actualizada</h2>
            </div>
            <div class="content">
              <p>Hola ${userName},</p>
              <p>Te confirmamos que la contraseña de tu cuenta en <strong>PlaquitasCR</strong> ha sido actualizada exitosamente.</p>
              
              <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
                <p><strong>📅 Fecha del cambio:</strong> ${new Date().toLocaleString(
                  'es-CR'
                )}</p>
              </div>
              
              <p class="warning">⚠️ Si no reconoces este cambio, por favor:</p>
              <ul>
                <li>Contacta a nuestro soporte inmediatamente</li>
                <li>Revisa la seguridad de tu cuenta</li>
                <li>Considera habilitar autenticación de dos factores si está disponible</li>
              </ul>
              
              <p>Para cualquier duda, puedes contactarnos:</p>
              <p><strong>Soporte:</strong> (+506) 7016-0434</p>
              <p><strong>Email:</strong> soporte@plaquitascr.com</p>
            </div>
            <div class="footer">
              <p>Este es un correo automático de notificación de seguridad.</p>
              <p>© ${new Date().getFullYear()} PlaquitasCR. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hola ${userName},\n\nTu contraseña en PlaquitasCR ha sido actualizada exitosamente.\n\nFecha: ${new Date().toLocaleString(
        'es-CR'
      )}\n\nSi no reconoces este cambio, contacta a soporte: (+506) 7016-0434\n\nEste es un correo automático.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email de confirmación enviado a ${email}`);
  } catch (error) {
    console.error('Error enviando email de confirmación:', error);
    // No fallar el proceso principal si el email de confirmación falla
  }
}
