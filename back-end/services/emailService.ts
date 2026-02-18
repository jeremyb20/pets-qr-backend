// services/emailService.ts
import nodemailer from 'nodemailer';
import path from 'path';
import hbs from 'nodemailer-express-handlebars';
import 'dotenv/config';
import fs from 'fs';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: any;
  lang?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private static instance: EmailService;
  private defaultLang: string = 'es';
  private validLangs: string[] = ['en', 'es', 'ar', 'vi', 'fr', 'zh'];

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
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      pool: true,
      maxConnections: 1,
      maxMessages: 5,
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private configureTemplatesForLang(lang: string = this.defaultLang): void {
    this.transporter.removeAllListeners('compile');

    const selectedLang = this.validLangs.includes(lang)
      ? lang
      : this.defaultLang;
    const viewsPath = path.resolve(__dirname, '..', 'views');
    const langPath = path.join(viewsPath, selectedLang);

    const finalPath = fs.existsSync(langPath)
      ? langPath
      : path.join(viewsPath, this.defaultLang);

    console.log(
      `📧 Usando plantillas de idioma: ${selectedLang} (ruta: ${finalPath})`
    );

    this.transporter.use(
      'compile',
      hbs({
        viewEngine: {
          extname: '.handlebars',
          partialsDir: finalPath,
          defaultLayout: false,
        },
        viewPath: finalPath,
        extName: '.handlebars',
      })
    );
  }

  private getSubject(key: string, lang: string = this.defaultLang): string {
    const subjects: { [key: string]: { [lang: string]: string } } = {
      'password-reset': {
        en: 'Password Reset - PlaquitasCR',
        es: 'Restablecimiento de contraseña - PlaquitasCR',
        ar: 'إعادة تعيين كلمة المرور - PlaquitasCR',
        vi: 'Đặt lại mật khẩu - PlaquitasCR',
        fr: 'Réinitialisation du mot de passe - PlaquitasCR',
        zh: '密码重置 - PlaquitasCR',
      },
      'password-changed': {
        en: 'Password Updated Successfully - PlaquitasCR',
        es: 'Contraseña actualizada exitosamente - PlaquitasCR',
        ar: 'تم تحديث كلمة المرور بنجاح - PlaquitasCR',
        vi: 'Mật khẩu đã được cập nhật thành công - PlaquitasCR',
        fr: 'Mot de passe mis à jour avec succès - PlaquitasCR',
        zh: '密码已成功更新 - PlaquitasCR',
      },
    };

    return (
      subjects[key]?.[lang] ||
      subjects[key]?.[this.defaultLang] ||
      'PlaquitasCR'
    );
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      this.configureTemplatesForLang(options.lang);

      await this.transporter.verify();
      console.log('✅ Servidor de correo listo');

      const mailOptions = {
        to: options.to,
        from: process.env.EMAIL_FROM || 'PlaquitasCR <support@plaquitascr.com>',
        subject: options.subject,
        template: options.template,
        context: options.context,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado a ${options.to}: ${info.messageId}`);
      return true;
    } catch (error: any) {
      const errorDetails = {
        to: options.to,
        template: options.template,
        lang: options.lang,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        message: error.message,
      };

      console.error('❌ Error enviando email:', errorDetails);

      if (error.responseCode === 535 || error.message.includes('535')) {
        console.error(
          '🔐 ERROR DE AUTENTICACIÓN: Verifica ZOHO_USER y ZOHO_PASSWORD en .env'
        );
        console.error('📧 Usuario:', process.env.ZOHO_USER);
        console.error('🔑 Password configurada?', !!process.env.ZOHO_PASSWORD);
      }

      return false;
    }
  }

  /**
   * Envía correo de restablecimiento de contraseña
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetUrl: string,
    lang: string = 'es'
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: this.getSubject('password-reset', lang),
      template: 'email-forgot',
      lang: lang,
      context: {
        userName: userName || 'Usuario',
        resetUrl,
        year: new Date().getFullYear(),
        companyName: 'PlaquitasCR',
        logoUrl:
          process.env.LOGO_URL ||
          'https://plaquitascr.com/assets/images/plaquitascr.png',
        phoneNumber: process.env.PHONE_NUMBER || '+50670160434',
        facebookUrl:
          process.env.FACEBOOK_URL ||
          'https://www.facebook.com/profile.php?id=100064041162056',
        facebookUsername: process.env.FACEBOOK_USERNAME || '@PlaquitasCR',
        instagramUrl:
          process.env.INSTAGRAM_URL || 'https://www.instagram.com/plaquitas_cr',
        instagramUsername: process.env.INSTAGRAM_USERNAME || '@plaquitas_cr',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@plaquitascr.com',
      },
    });
  }

  /**
   * Envía confirmación de cambio de contraseña
   */
  async sendPasswordChangedConfirmation(
    email: string,
    userName: string,
    req: any,
    lang: string = 'es'
  ): Promise<boolean> {
    const deviceInfo = this.getDeviceInfo(req);
    const loginUrl = process.env.FRONTEND_URL || 'https://plaquitascr.com';

    return this.sendEmail({
      to: email,
      subject: this.getSubject('password-changed', lang),
      template: 'email-password-changed',
      lang: lang,
      context: {
        userName: userName || 'Usuario',
        changeDate: new Date().toLocaleString(
          lang === 'en'
            ? 'en-US'
            : lang === 'ar'
              ? 'ar-SA'
              : lang === 'vi'
                ? 'vi-VN'
                : lang === 'fr'
                  ? 'fr-FR'
                  : lang === 'zh'
                    ? 'zh-CN'
                    : 'es-CR',
          {
            timeZone: 'America/Costa_Rica',
            dateStyle: 'full',
            timeStyle: 'long',
          }
        ),
        deviceInfo,
        loginUrl: `${loginUrl}/login`,
        year: new Date().getFullYear(),
        companyName: 'PlaquitasCR',
        logoUrl:
          process.env.LOGO_URL ||
          'https://plaquitascr.com/assets/images/plaquitascr.png',
        phoneNumber: process.env.PHONE_NUMBER || '+50670160434',
        facebookUrl:
          process.env.FACEBOOK_URL ||
          'https://www.facebook.com/profile.php?id=100064041162056',
        facebookUsername: process.env.FACEBOOK_USERNAME || '@PlaquitasCR',
        instagramUrl:
          process.env.INSTAGRAM_URL || 'https://www.instagram.com/plaquitas_cr',
        instagramUsername: process.env.INSTAGRAM_USERNAME || '@plaquitas_cr',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@plaquitascr.com',
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
