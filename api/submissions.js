// Vercel Serverless Function — Submissions Sync API
// Bridges cross-platform clip submissions between clipper and advertiser platforms

const REMOTE_API = process.env.KONVEER_SYNC_URL || 'http://185.111.246.222:48125';

let inMemorySubmissions = [];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch submissions
  if (req.method === 'GET') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const upstream = await fetch(`${REMOTE_API}/api/submissions`, {
        signal: controller.signal
      });
      clearTimeout(timer);

      if (upstream.ok) {
        const data = await upstream.json();
        if (data && Array.isArray(data.submissions)) {
          inMemorySubmissions = data.submissions;
          return res.status(200).json({ ok: true, submissions: data.submissions });
        }
      }
    } catch (err) {
      console.warn('[Vercel API] Warning: could not reach remote submissions API, using cache:', err.message);
    }

    return res.status(200).json({ ok: true, submissions: inMemorySubmissions });
  }

  // POST: Clipper submits a new clip
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (!body || !body.videoUrl) {
      return res.status(400).json({ ok: false, error: 'Ссылка на видеоролик обязательна' });
    }

    body.id = body.id || ('sub_' + Date.now());

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(`${REMOTE_API}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (upstream.ok) {
        const data = await upstream.json();
        if (data && data.submission) {
          const idx = inMemorySubmissions.findIndex(s => s.id === data.submission.id);
          if (idx >= 0) inMemorySubmissions[idx] = data.submission;
          else inMemorySubmissions.unshift(data.submission);
        }
        return res.status(200).json(data);
      }
    } catch (err) {
      console.warn('[Vercel API] Warning: could not reach remote submissions on POST:', err.message);
    }

    const idx = inMemorySubmissions.findIndex(s => s.id === body.id);
    if (idx >= 0) inMemorySubmissions[idx] = body;
    else inMemorySubmissions.unshift(body);

    return res.status(200).json({ ok: true, submission: body, cached: true });
  }

  // PATCH: Advertiser approves/rejects clip
  if (req.method === 'PATCH') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(`${REMOTE_API}/api/submissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (upstream.ok) {
        const data = await upstream.json();
        return res.status(200).json(data);
      }
    } catch (err) {
      console.warn('[Vercel API] Warning: could not reach remote submissions on PATCH:', err.message);
    }

    const sub = inMemorySubmissions.find(s => s.id === body.submissionId);
    if (sub) {
      if (body.status) sub.status = body.status;
      if (body.rejectionReason) sub.rejectionReason = body.rejectionReason;
      return res.status(200).json({ ok: true, submission: sub, cached: true });
    }

    return res.status(200).json({ ok: true, updated: false });
  }

  return res.status(405).json({ ok: false, error: 'Метод не разрешен' });
};
