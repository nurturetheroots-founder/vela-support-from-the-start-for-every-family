import { Resend } from 'resend';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be imported on the server.');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
