const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('../middleware/logger');

class NotificationService {
  constructor({ transports = [] } = {}) {
    this.transports = transports;
  }

  async send(event, payload) {
    const enrichedPayload = {
      ...payload,
      event,
      timestamp: new Date().toISOString(),
    };

    const results = await Promise.allSettled(
      this.transports.map((transport) => transport.send(enrichedPayload))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn('Notification transport failed', {
          event,
          transport: this.transports[index]?.name || `transport-${index}`,
          error: result.reason?.message || result.reason,
        });
      }
    });

    return results;
  }
}

class ConsoleTransport {
  constructor(name = 'console') {
    this.name = name;
  }

  async send(payload) {
    logger.info('Notification emitted', {
      event: payload.event,
      channel: this.name,
      details: payload,
    });
  }
}

class EmailTransport {
  constructor(options) {
    const {
      host,
      port,
      secure = false,
      user,
      pass,
      from,
      to,
    } = options || {};

    if (!host || !port || !from || !to) {
      throw new Error('Email transport missing SMTP host, port, from, or to');
    }

    this.name = 'email';
    this.from = from;
    this.to = Array.isArray(to)
      ? to
      : `${to}`
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(payload) {
    const subject = `[${payload.event}] Notification`;
    const text = JSON.stringify(payload, null, 2);

    await this.transporter.sendMail({
      from: this.from,
      to: this.to,
      subject,
      text,
    });

    logger.info('Email notification dispatched', {
      event: payload.event,
      recipients: this.to,
    });
  }
}

class SlackWebhookTransport {
  constructor(options) {
    const { webhookUrl, username = 'Telecom Billing Bot' } = options || {};

    if (!webhookUrl) {
      throw new Error('Slack transport requires webhookUrl');
    }

    this.name = 'slack';
    this.webhookUrl = webhookUrl;
    this.username = username;
  }

  async send(payload) {
    const message = {
      username: this.username,
      text: `*${payload.event}*\n\n\`${JSON.stringify(payload, null, 2)}\``,
    };

    await axios.post(this.webhookUrl, message);
    logger.info('Slack notification dispatched', { event: payload.event });
  }
}

const buildTransportsFromEnv = () => {
  const transports = [new ConsoleTransport()];

  if (process.env.SMTP_ENABLED === 'true') {
    try {
      transports.push(
        new EmailTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
          from: process.env.SMTP_FROM,
          to: process.env.NOTIFICATION_EMAIL_TO || process.env.SMTP_FROM,
        })
      );
    } catch (error) {
      logger.warn('Email transport not configured', { error: error.message });
    }
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      transports.push(
        new SlackWebhookTransport({
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          username: process.env.SLACK_WEBHOOK_USERNAME || 'Telecom Billing Bot',
        })
      );
    } catch (error) {
      logger.warn('Slack transport not configured', { error: error.message });
    }
  }

  return transports;
};

const defaultService = new NotificationService({
  transports: buildTransportsFromEnv(),
});

module.exports = {
  NotificationService,
  ConsoleTransport,
  EmailTransport,
  SlackWebhookTransport,
  buildTransportsFromEnv,
  defaultService,
};
