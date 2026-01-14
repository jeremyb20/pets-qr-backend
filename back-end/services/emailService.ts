// services/emailService.ts
import nodemailer from 'nodemailer';
import path from 'path';
import hbs from 'nodemailer-express-handlebars';
import 'dotenv/config';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: any;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private static instance: EmailService;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.ZOHO_HOST || process.env.EMAIL_HOST,
      port: parseInt(process.env.ZOHO_PORT || process.env.EMAIL_PORT || '587'),
      secure: process.env.ZOHO_SECURE === 'true' || true,
      auth: {
        user: process.env.ZOHO_USER || process.env.EMAIL_USER,
        pass: process.env.ZOHO_PASSWORD || process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      // Configuraciones para evitar timeout
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      // Pooling
      pool: true,
      maxConnections: 1,
      maxMessages: 5,
    });

    this.configureTemplates();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private configureTemplates(): void {
    this.transporter.use(
      'compile',
      hbs({
        viewEngine: {
          extname: '.handlebars',
          partialsDir: path.resolve(__dirname, '..', 'views'),
          defaultLayout: false,
        },
        viewPath: path.resolve(__dirname, '..', 'views'),
        extName: '.handlebars',
      })
    );
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Verificar conexión
      await this.transporter.verify();
      console.log('Servidor de correo listo para enviar mensajes');

      const mailOptions = {
        to: options.to,
        from: process.env.EMAIL_FROM || 'soporte@localpetsandfamily.com',
        subject: options.subject,
        template: options.template,
        context: options.context,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email enviado exitosamente a: ${options.to}`);
      return true;
    } catch (error: any) {
      console.error('Error enviando email:', {
        to: options.to,
        error: error.message,
        template: options.template,
      });
      return false;
    }
  }

  // Métodos específicos para diferentes tipos de email

  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetUrl: string
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Restablecimiento de contraseña - PlaquitasCR',
      template: 'email-forgot',
      context: {
        userName: userName || 'Usuario',
        resetUrl,
        year: new Date().getFullYear(),
        companyName: 'PlaquitasCR',
        greeting: 'Estimado/a usuario/a,',
        instruction1:
          'Recibió este correo porque solicitó restablecer la contraseña de su cuenta.',
        instruction2:
          'Para completar el proceso, haga clic en el siguiente enlace:',
        buttonText: 'Restablecer Contraseña',
        warning: 'Este enlace expirará en 1 hora.',
        instruction3:
          'Si no solicitó este restablecimiento, ignore este correo. Su contraseña permanecerá segura.',
        closing: 'Gracias por utilizar nuestros servicios.',
        signature: 'El equipo de PlaquitasCR',
      },
    });
  }

  async sendPasswordChangedConfirmation(
    email: string,
    userName: string,
    req: any
  ): Promise<boolean> {
    const deviceInfo = this.getDeviceInfo(req);
    const loginUrl = process.env.FRONTEND_URL || 'https://tudominio.com';

    return this.sendEmail({
      to: email,
      subject: 'Contraseña actualizada exitosamente - PlaquitasCR',
      template: 'email-password-changed',
      context: {
        userName: userName || 'Usuario',
        changeDate: new Date().toLocaleString('es-CR', {
          timeZone: 'America/Costa_Rica',
          dateStyle: 'full',
          timeStyle: 'long',
        }),
        deviceInfo,
        loginUrl: `${loginUrl}/login`,
        year: new Date().getFullYear(),
        companyName: 'PlaquitasCR',
        closing: 'Gracias por mantener segura tu cuenta.',
        signature: 'El equipo de PlaquitasCR',
      },
    });
  }

  private getDeviceInfo(req: any): string {
    const userAgent = req.headers['user-agent'] || 'Dispositivo desconocido';
    const ip =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      'IP desconocida';

    return `Navegador/App: ${userAgent.substring(0, 50)}... | IP: ${ip}`;
  }
}

export default EmailService;
