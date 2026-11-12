import { listThreads, ThreadListItem } from '@/lib/integrations/gmail';
import { EmailMessage } from '@/store/features/email/emailSlice';

export interface GetEmailsParams {
  query?: string;
  forceRefresh?: boolean;
}

export const emailApi = {
  getEmails: async (params?: GetEmailsParams): Promise<{ data: { items: EmailMessage[] } }> => {
    try {
      const res = await listThreads(params?.query);
      const items: EmailMessage[] = (res.threads || []).map((t: ThreadListItem) => ({
        id: t.id,
        threadId: t.id,
        subject: t.subject || '(No Subject)',
        from: t.from,
        sender: t.from,
        snippet: t.snippet || '',
        date: t.date || new Date().toISOString(),
        unread: t.unread,
        messageCount: t.messageCount,
      }));
      return { data: { items } };
    } catch {
      // Return empty list if unauthorized or unconfigured rather than crashing
      return { data: { items: [] } };
    }
  },
};

