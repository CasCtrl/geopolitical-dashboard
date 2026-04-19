import nodemailer from 'nodemailer';

interface EmailConfig {
  service?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType: string;
  }>;
}

let transporter: nodemailer.Transporter | null = null;

export function initializeEmailService(config: EmailConfig): void {
  transporter = nodemailer.createTransport(config);
}

export async function sendReportEmail(options: EmailOptions): Promise<any> {
  if (!transporter) {
    throw new Error('Email service not initialized. Call initializeEmailService first.');
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@geopolitical-dashboard.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
    });

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

export function generateReportEmailHTML(
  reportTitle: string,
  recipientName: string,
  reportSummary: Record<string, any>
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
          .summary-item { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #667eea; }
          .summary-item strong { color: #667eea; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          a { color: #667eea; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${reportTitle}</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="content">
            <p>Hello ${recipientName},</p>
            <p>Your geopolitical risk analysis report has been generated. Here's a summary:</p>
            
            ${Object.entries(reportSummary)
              .map(
                ([key, value]) =>
                  `<div class="summary-item"><strong>${key}:</strong> ${value}</div>`
              )
              .join('')}
            
            <p style="margin-top: 20px;">For detailed analysis and charts, please see the attached report.</p>
          </div>
          
          <div class="footer">
            <p>Geopolitical Dashboard | Risk Analysis & Reporting System</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
