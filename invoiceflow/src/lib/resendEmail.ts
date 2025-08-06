import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

// Check for required environment variables
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not set in environment variables');
  throw new Error('Email service is not configured. Please set RESEND_API_KEY environment variable.');
}

if (!process.env.RESEND_FROM_EMAIL) {
  console.error('RESEND_FROM_EMAIL is not set in environment variables');
  throw new Error('Email service is not configured. Please set RESEND_FROM_EMAIL environment variable.');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailWithPDF({ to, subject, html, pdfBuffer, pdfFilename }: SendEmailOptions) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!, // Use env variable for sender
    to,
    subject,
    html,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
      },
    ],
  });
} 