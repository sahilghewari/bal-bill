const logger = require('../middleware/logger');

const DEFAULT_MAX_EVENTS = 100;

const maxEvents = parseInt(process.env.NOTIFICATION_FEED_MAX_EVENTS, 10) || DEFAULT_MAX_EVENTS;
const feed = [];

const normalizeEntry = ({ level, message, timestamp, meta = {} }) => {
  const eventName = meta.event || meta?.details?.event || meta?.payload?.event;
  if (!eventName) {
    return null;
  }

  return {
    id: `${timestamp}-${eventName}-${feed.length}`,
    event: eventName,
    level,
    message,
    channel: meta.channel || meta?.details?.channel || meta?.payload?.channel,
    transport: meta.transport,
    timestamp: timestamp || new Date().toISOString(),
    details: meta.details || meta,
  };
};

const appendEvent = (entry) => {
  const normalized = normalizeEntry(entry);
  if (!normalized) return;

  feed.unshift(normalized);

  if (feed.length > maxEvents) {
    feed.length = maxEvents;
  }
};

const unsubscribe = logger.subscribe((entry) => {
  try {
    appendEvent(entry);
  } catch (error) {
    // Deliberately swallow errors to avoid logging recursion
  }
});

const getFeed = (limit) => {
  if (!limit || Number.isNaN(limit)) {
    return [...feed];
  }

  return feed.slice(0, Math.max(0, limit));
};

const clearFeed = () => {
  feed.length = 0;
};

process.on('exit', () => {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }
});

module.exports = {
  getFeed,
  clearFeed,
  maxEvents,
};
