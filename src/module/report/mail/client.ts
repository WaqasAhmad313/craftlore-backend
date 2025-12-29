import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL;

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY is not defined');
}

if (!resendFrom) {
  throw new Error('RESEND_FROM_EMAIL is not defined');
}

export const mailConfig = {
  from: resendFrom,
};

export const resendClient = new Resend(resendApiKey);
