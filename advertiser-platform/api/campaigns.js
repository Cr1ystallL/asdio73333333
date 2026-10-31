// Vercel Serverless Function — Campaigns Sync API
// Bridges cross-platform requests from konveer-advertiser & konveer-clipper to the central sync database

const REMOTE_API = process.env.KONVEER_SYNC_URL || 'http://185.111.246.222:48125';

let inMemoryCampaigns = [];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch all active campaigns
  if (req.method === 'GET') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const upstream = await fetch(`${REMOTE_API}/api/campaigns`, {
        signal: controller.signal
      });
      clearTimeout(timer);

      if (upstream.ok) {
        const data = await upstream.json();
        if (data && Array.isArray(data.campaigns)) {
          inMemoryCampaigns = data.campaigns;
          return res.status(200).json({ ok: true, campaigns: data.campaigns });
        }
      }
    } catch (err) {
      console.warn('[Vercel API] Warning: could not reach remote sync server, using fallback cache:', err.message);
    }

    return res.status(200).json({ ok: true, campaigns: inMemoryCampaigns });
  }

  // POST: Create or update a campaign
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (!body || !body.title) {
      return res.status(400).json({ ok: false, error: 'Заголовок задания обязателен' });
    }

    body.id = body.id || ('camp_' + Date.now());

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(`${REMOTE_API}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (upstream.ok) {
        const data = await upstream.json();
        if (data && data.campaign) {
          const idx = inMemoryCampaigns.findIndex(c => c.id === data.campaign.id);
          if (idx >= 0) inMemoryCampaigns[idx] = data.campaign;
          else inMemoryCampaigns.unshift(data.campaign);
        }
        return res.status(200).json(data);
      }
    } catch (err) {
      console.warn('[Vercel API] Warning: could not reach remote sync server on POST, saving locally:', err.message);
    }

    const idx = inMemoryCampaigns.findIndex(c => c.id === body.id);
    if (idx >= 0) inMemoryCampaigns[idx] = body;
    else inMemoryCampaigns.unshift(body);

    return res.status(200).json({ ok: true, campaign: body, cached: true });
  }

  return res.status(405).json({ ok: false, error: 'Метод не разрешен' });
};
