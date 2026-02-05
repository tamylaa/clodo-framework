/**
 * Email Workers Utilities
 * Handle incoming emails with Email Workers
 * 
 * @example
 * import { EmailHandler, EmailParser } from '@tamyla/clodo-framework/utilities/email';
 * 
 * export default {
 *   async email(message, env) {
 *     const handler = new EmailHandler(message, env);
 *     
 *     // Parse email
 *     const parsed = await handler.parse();
 *     console.log('From:', parsed.from);
 *     console.log('Subject:', parsed.subject);
 *     
 *     // Forward with modifications
 *     await handler.forward('forward@example.com', {
 *       headers: { 'X-Processed': 'true' }
 *     });
 *   }
 * }
 */

/**
 * Email Handler for Email Workers
 */
export class EmailHandler {
  /**
   * @param {EmailMessage} message - Email message from worker
   * @param {Object} env - Environment bindings
   */
  constructor(message, env) {
    this.message = message;
    this.env = env;
    this._parsed = null;
  }

  /**
   * Get sender address
   */
  get from() {
    return this.message.from;
  }

  /**
   * Get recipient address
   */
  get to() {
    return this.message.to;
  }

  /**
   * Get raw email size in bytes
   */
  get size() {
    return this.message.rawSize;
  }

  /**
   * Get email headers
   */
  get headers() {
    return this.message.headers;
  }

  /**
   * Parse email content
   * @returns {Promise<Object>} Parsed email
   */
  async parse() {
    if (this._parsed) return this._parsed;
    
    const parser = new EmailParser();
    this._parsed = await parser.parse(this.message);
    return this._parsed;
  }

  /**
   * Forward email to another address
   * @param {string} to - Destination address
   * @param {Object} options - Forward options
   */
  async forward(to, options = {}) {
    const headers = new Headers(this.message.headers);
    
    // Add custom headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    await this.message.forward(to, headers);
  }

  /**
   * Reply to the email (requires send capability)
   * @param {Object} options - Reply options
   */
  async reply(options = {}) {
    if (!this.env.SEND_EMAIL) {
      throw new Error('SEND_EMAIL binding required for replies');
    }

    const parsed = await this.parse();
    
    const email = new EmailBuilder()
      .from(options.from || this.to)
      .to(this.from)
      .subject(`Re: ${parsed.subject}`)
      .text(options.text || '')
      .html(options.html);

    // Add In-Reply-To header
    if (parsed.messageId) {
      email.header('In-Reply-To', parsed.messageId);
      email.header('References', parsed.messageId);
    }

    await this.env.SEND_EMAIL.send(email.build());
  }

  /**
   * Reject the email
   * @param {string} reason - Rejection reason
   */
  async reject(reason = 'Message rejected') {
    await this.message.setReject(reason);
  }

  /**
   * Get raw email content
   * @returns {Promise<ReadableStream>}
   */
  async raw() {
    return this.message.raw;
  }

  /**
   * Get raw email as text
   * @returns {Promise<string>}
   */
  async rawText() {
    const raw = await this.raw();
    const reader = raw.getReader();
    const chunks = [];
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    return new TextDecoder().decode(
      new Uint8Array(chunks.flatMap(c => [...c]))
    );
  }
}

/**
 * Email Parser
 */
export class EmailParser {
  /**
   * Parse an email message
   * @param {EmailMessage} message
   * @returns {Promise<Object>}
   */
  async parse(message) {
    const headers = message.headers;
    const rawText = await this._getRawText(message);
    
    // Parse headers
    const subject = headers.get('subject') || '';
    const from = this._parseAddress(headers.get('from') || message.from);
    const to = this._parseAddresses(headers.get('to') || message.to);
    const cc = this._parseAddresses(headers.get('cc') || '');
    const date = new Date(headers.get('date') || Date.now());
    const messageId = headers.get('message-id');
    
    // Parse body
    const { text, html, attachments } = this._parseBody(rawText, headers);
    
    return {
      messageId,
      from,
      to,
      cc,
      subject,
      date,
      text,
      html,
      attachments,
      headers: Object.fromEntries(headers.entries())
    };
  }

  async _getRawText(message) {
    const raw = await message.raw;
    const reader = raw.getReader();
    const chunks = [];
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    return new TextDecoder().decode(
      new Uint8Array(chunks.flatMap(c => [...c]))
    );
  }

  _parseAddress(address) {
    const match = address.match(/(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?/);
    if (match) {
      return {
        name: match[1]?.trim() || '',
        email: match[2].trim()
      };
    }
    return { name: '', email: address.trim() };
  }

  _parseAddresses(addresses) {
    if (!addresses) return [];
    return addresses.split(',').map(a => this._parseAddress(a.trim()));
  }

  _parseBody(rawText, headers) {
    const contentType = headers.get('content-type') || 'text/plain';
    const result = { text: '', html: '', attachments: [] };
    
    // Simple parsing - for complex emails, use a proper MIME parser
    if (contentType.includes('multipart')) {
      const boundary = this._getBoundary(contentType);
      if (boundary) {
        const parts = rawText.split(`--${boundary}`);
        for (const part of parts) {
          if (part.includes('Content-Type: text/plain')) {
            result.text = this._extractContent(part);
          } else if (part.includes('Content-Type: text/html')) {
            result.html = this._extractContent(part);
          } else if (part.includes('Content-Disposition: attachment')) {
            result.attachments.push(this._parseAttachment(part));
          }
        }
      }
    } else if (contentType.includes('text/html')) {
      result.html = rawText.split('\r\n\r\n').slice(1).join('\r\n\r\n');
    } else {
      result.text = rawText.split('\r\n\r\n').slice(1).join('\r\n\r\n');
    }
    
    return result;
  }

  _getBoundary(contentType) {
    const match = contentType.match(/boundary=["']?([^"'\s;]+)["']?/);
    return match ? match[1] : null;
  }

  _extractContent(part) {
    const lines = part.split('\r\n');
    const bodyStart = lines.findIndex(l => l === '') + 1;
    return lines.slice(bodyStart).join('\r\n').trim();
  }

  _parseAttachment(part) {
    const filenameMatch = part.match(/filename=["']?([^"'\r\n]+)["']?/);
    const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n;]+)/);
    
    return {
      filename: filenameMatch ? filenameMatch[1] : 'attachment',
      contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
      content: this._extractContent(part)
    };
  }
}

/**
 * Email Builder for sending emails
 */
export class EmailBuilder {
  constructor() {
    this._from = '';
    this._to = [];
    this._cc = [];
    this._bcc = [];
    this._subject = '';
    this._text = '';
    this._html = '';
    this._headers = new Map();
    this._attachments = [];
  }

  from(address) {
    this._from = address;
    return this;
  }

  to(address) {
    this._to = Array.isArray(address) ? address : [address];
    return this;
  }

  cc(address) {
    this._cc = Array.isArray(address) ? address : [address];
    return this;
  }

  bcc(address) {
    this._bcc = Array.isArray(address) ? address : [address];
    return this;
  }

  subject(subject) {
    this._subject = subject;
    return this;
  }

  text(text) {
    this._text = text;
    return this;
  }

  html(html) {
    this._html = html;
    return this;
  }

  header(key, value) {
    this._headers.set(key, value);
    return this;
  }

  attachment(filename, content, contentType = 'application/octet-stream') {
    this._attachments.push({ filename, content, contentType });
    return this;
  }

  build() {
    return {
      personalizations: [{
        to: this._to.map(email => ({ email })),
        cc: this._cc.length ? this._cc.map(email => ({ email })) : undefined,
        bcc: this._bcc.length ? this._bcc.map(email => ({ email })) : undefined
      }],
      from: { email: this._from },
      subject: this._subject,
      content: [
        this._text ? { type: 'text/plain', value: this._text } : null,
        this._html ? { type: 'text/html', value: this._html } : null
      ].filter(Boolean),
      headers: Object.fromEntries(this._headers),
      attachments: this._attachments.length ? this._attachments : undefined
    };
  }
}

export default EmailHandler;
