/* RFC 2822 raw-email builder for Gmail API messages.send. */

export interface RawEmailParams {
  to: string;
  from: string;
  subject: string;
  body: string;
  cc?: string;
  inReplyTo?: string;
  references?: string;
}

export function buildRaw({
  to,
  from,
  subject,
  body,
  cc,
  inReplyTo,
  references,
}: RawEmailParams): string {
  const encodedSubject = /^[\x00-\x7F]*$/.test(subject || '')
    ? subject
    : `=?UTF-8?B?${Buffer.from(subject || '').toString('base64')}?=`;

  const headers: string[] = [
    `From: ${from}`,
    `To: ${to}`,
  ];

  if (cc?.trim()) {
    headers.push(`Cc: ${cc.trim()}`);
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(body || '');

  headers.push(
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    'Content-Transfer-Encoding: 8bit',
  );

  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);

  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${body || ''}`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
