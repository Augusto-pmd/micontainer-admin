import { api } from './api';

export interface SendResult { sent: number; total: number; errors: string[]; }

export const sendMailing = async (to: string[], subject: string, text: string, from?: string): Promise<SendResult> => {
  const r = await api.post('/mailing/send', { to, subject, text, from });
  return r.data;
};
