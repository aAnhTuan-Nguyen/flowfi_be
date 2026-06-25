import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { AppConfig } from '../config/env.validation';
import { ErrorCode } from '../common/errors/error-code.enum';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService<AppConfig>) {}

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    const host = this.configService.get('smtpHost', { infer: true });
    const port = this.configService.get('smtpPort', { infer: true });
    const user = this.configService.get('smtpUser', { infer: true });
    const pass = this.configService.get('smtpPass', { infer: true });
    const from = this.configService.get('smtpFrom', { infer: true });

    if (!host || !port || !from) {
      throw new ServiceUnavailableException({
        code: ErrorCode.BadRequest,
        message: 'SMTP is not configured',
      });
    }

    const options: SMTPTransport.Options = {
      host,
      port,
      secure: port === 465,
    };
    if (user && pass) {
      options.auth = { user, pass };
    }

    const transport = createTransport(options);
    await transport.sendMail({
      from,
      to: email,
      subject: 'FlowFi password reset code',
      text: `Your FlowFi password reset code is ${otp}. It will expire soon.`,
    });
  }
}
