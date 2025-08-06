import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// Check for required environment variables
if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set in environment variables - email service will be disabled');
}

if (!process.env.RESEND_FROM_EMAIL) {
  console.warn('RESEND_FROM_EMAIL is not set in environment variables - email service will be disabled');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailWithPDF({ to, subject, html, pdfBuffer, pdfFilename }) {
  // Check if email service is configured
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('Email service not configured - skipping email send');
    return { success: true, message: 'Email service not configured' };
  }

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL, // Use env variable for sender
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