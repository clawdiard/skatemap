/**
 * OneSignal notification helper for GitHub Actions.
 * Requires ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY env vars.
 */

async function sendNotification({ title, message, url, filters }) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.log('OneSignal not configured, skipping notification:', title);
    return null;
  }

  const body = {
    app_id: appId,
    headings: { en: title },
    contents: { en: message },
    ...(url && { url }),
    ...(filters && { filters }),
    enable_frequency_cap: true,
  };

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('OneSignal error:', data);
    return null;
  }
  console.log(`Notification sent: "${title}" → ${data.recipients || 0} recipients`);
  return data;
}

/**
 * Send a park-specific notification to users who favorited that park.
 */
async function notifyParkSubscribers({ type, parkSlug, title, message, url }) {
  return sendNotification({
    title,
    message,
    url,
    filters: [
      { field: 'tag', key: `fav_${parkSlug}`, value: 'true' },
      { operator: 'AND' },
      { field: 'tag', key: `notify_${type}`, value: 'true' },
    ],
  });
}

/**
 * Send a broadcast notification filtered by preference tag.
 */
async function notifyByPreference({ type, title, message, url }) {
  return sendNotification({
    title,
    message,
    url,
    filters: [
      { field: 'tag', key: `notify_${type}`, value: 'true' },
    ],
  });
}

module.exports = { sendNotification, notifyParkSubscribers, notifyByPreference };
