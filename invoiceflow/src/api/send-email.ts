import { sendEmailWithPDF } from '../lib/resendEmail';

module.exports = async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, pdfBase64, pdfFilename } = req.body;

  if (!to || !subject || !html || !pdfBase64 || !pdfFilename) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    await sendEmailWithPDF({ to, subject, html, pdfBuffer, pdfFilename });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}; 