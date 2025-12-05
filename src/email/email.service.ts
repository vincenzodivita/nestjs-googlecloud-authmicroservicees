import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor() {
    // Configurazione del transporter
    // In produzione usa variabili d'ambiente
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true per 465, false per altri
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Per Gmail usa App Password
      },
    });

    // Verifica la connessione al server SMTP
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        this.logger.log('✅ SMTP server connection verified');
      } else {
        this.logger.warn('⚠️ SMTP credentials not configured - emails will be logged only');
      }
    } catch (error) {
      this.logger.error('❌ SMTP connection failed:', error.message);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Se SMTP non è configurato, logga l'email (utile per development)
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        this.logger.log(`📧 [DEV MODE] Email would be sent to: ${options.to}`);
        this.logger.log(`📧 Subject: ${options.subject}`);
        this.logger.debug(`📧 Content: ${options.text || options.html}`);
        return true;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || `"Setlist Manager" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${options.to}:`, error.message);
      return false;
    }
  }

  // Template: Email di benvenuto dopo la registrazione
  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Benvenuto su Setlist Manager</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #f1f1f1; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <div style="background: linear-gradient(135deg, #e94560, #0f3460); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white;">🎵 Setlist Manager</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #e94560;">Ciao ${name}!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Grazie per esserti registrato su <strong style="color: #f1f1f1;">Setlist Manager</strong>! 
              Siamo entusiasti di averti a bordo.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Con Setlist Manager puoi:
            </p>
            <ul style="color: #a0a0a0; line-height: 2;">
              <li>📝 Creare e gestire i tuoi brani con sezioni dettagliate</li>
              <li>📋 Organizzare le tue setlist per concerti ed eventi</li>
              <li>🎯 Usare il metronomo integrato in modalità Live</li>
              <li>🤝 Condividere brani e setlist con i tuoi amici</li>
            </ul>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'https://setlist-manager.web.app'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #e94560, #f43f5e); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Inizia subito →
              </a>
            </div>
          </div>
          <div style="background-color: #16213e; padding: 20px 30px; text-align: center; border-top: 1px solid #2a2a3e;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              © ${new Date().getFullYear()} Setlist Manager. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: '🎵 Benvenuto su Setlist Manager!',
      html,
    });
  }

  // Template: Email di verifica
  async sendVerificationEmail(to: string, name: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #f1f1f1; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #e94560, #0f3460); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white;">🎵 Setlist Manager</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #e94560;">Verifica la tua email</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Ciao <strong style="color: #f1f1f1;">${name}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Per completare la registrazione e attivare il tuo account, clicca sul pulsante qui sotto:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ✓ Verifica Email
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Se il pulsante non funziona, copia e incolla questo link nel browser:
            </p>
            <p style="font-size: 12px; color: #e94560; word-break: break-all;">
              ${verificationUrl}
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              ⏰ Questo link scadrà tra 24 ore.
            </p>
          </div>
          <div style="background-color: #16213e; padding: 20px 30px; text-align: center; border-top: 1px solid #2a2a3e;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Se non hai richiesto questa email, puoi ignorarla.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: '✉️ Verifica il tuo indirizzo email - Setlist Manager',
      html,
    });
  }

  // Template: Email per reset password
  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #f1f1f1; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #e94560, #0f3460); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white;">🎵 Setlist Manager</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #f59e0b;">🔐 Reset Password</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Ciao <strong style="color: #f1f1f1;">${name}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Abbiamo ricevuto una richiesta per reimpostare la password del tuo account.
              Clicca sul pulsante qui sotto per creare una nuova password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                🔑 Reimposta Password
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Se il pulsante non funziona, copia e incolla questo link nel browser:
            </p>
            <p style="font-size: 12px; color: #e94560; word-break: break-all;">
              ${resetUrl}
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              ⏰ Questo link scadrà tra 1 ora.
            </p>
            <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 15px; margin-top: 20px;">
              <p style="margin: 0; font-size: 14px; color: #f87171;">
                ⚠️ Se non hai richiesto il reset della password, ignora questa email. 
                La tua password rimarrà invariata.
              </p>
            </div>
          </div>
          <div style="background-color: #16213e; padding: 20px 30px; text-align: center; border-top: 1px solid #2a2a3e;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              © ${new Date().getFullYear()} Setlist Manager
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: '🔐 Reset Password - Setlist Manager',
      html,
    });
  }

  // Template: Notifica richiesta di amicizia
  async sendFriendRequestEmail(to: string, recipientName: string, senderName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #f1f1f1; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #e94560, #0f3460); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white;">🎵 Setlist Manager</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #a78bfa;">👋 Nuova richiesta di amicizia!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Ciao <strong style="color: #f1f1f1;">${recipientName}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              <strong style="color: #f1f1f1;">${senderName}</strong> ti ha inviato una richiesta di amicizia su Setlist Manager!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/friends" 
                 style="display: inline-block; background: linear-gradient(135deg, #a78bfa, #818cf8); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Visualizza Richiesta →
              </a>
            </div>
          </div>
          <div style="background-color: #16213e; padding: 20px 30px; text-align: center; border-top: 1px solid #2a2a3e;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              © ${new Date().getFullYear()} Setlist Manager
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `👋 ${senderName} ti ha inviato una richiesta di amicizia!`,
      html,
    });
  }

  // Template: Notifica amicizia accettata
  async sendFriendAcceptedEmail(to: string, recipientName: string, friendName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #f1f1f1; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #e94560, #0f3460); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white;">🎵 Setlist Manager</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #10b981;">🎉 Richiesta accettata!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Ciao <strong style="color: #f1f1f1;">${recipientName}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              <strong style="color: #f1f1f1;">${friendName}</strong> ha accettato la tua richiesta di amicizia!
              Ora potete condividere brani e setlist.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/friends" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Vedi i tuoi amici →
              </a>
            </div>
          </div>
          <div style="background-color: #16213e; padding: 20px 30px; text-align: center; border-top: 1px solid #2a2a3e;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              © ${new Date().getFullYear()} Setlist Manager
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `🎉 ${friendName} ha accettato la tua richiesta di amicizia!`,
      html,
    });
  }

  // Template: Password cambiata con successo
  async sendPasswordChangedEmail(to: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f23; color: #f1f1f1; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #e94560, #0f3460); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; color: white;">🎵 Setlist Manager</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #10b981;">✅ Password modificata</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              Ciao <strong style="color: #f1f1f1;">${name}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0;">
              La tua password è stata modificata con successo.
            </p>
            <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 15px; margin-top: 20px;">
              <p style="margin: 0; font-size: 14px; color: #f87171;">
                ⚠️ Se non hai effettuato tu questa modifica, contattaci immediatamente 
                e cambia la tua password il prima possibile.
              </p>
            </div>
          </div>
          <div style="background-color: #16213e; padding: 20px 30px; text-align: center; border-top: 1px solid #2a2a3e;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              © ${new Date().getFullYear()} Setlist Manager
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: '✅ Password modificata - Setlist Manager',
      html,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}