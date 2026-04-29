const CONFIG = {
  baseUrl: process.env.BASE_URL || "https://kiberonekaliningrad.s20.online",
  companyId: Number(process.env.COMPANY_ID || "18"),
  apiKey: process.env.API_KEY,
  appKey: process.env.APP_KEY,
  pageSize: Number(process.env.PAGE_SIZE || "500"),
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!CONFIG.apiKey || !CONFIG.appKey) {
    return res.status(500).json({
      error: "Missing Vercel env vars: API_KEY and APP_KEY",
    });
  }

  const page = Number.parseInt(req.query.page || "0", 10);

  try {
    const url = `${CONFIG.baseUrl}/v2api/${CONFIG.companyId}/lead/index`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": CONFIG.apiKey,
        "X-APP-KEY": CONFIG.appKey,
        Accept: "application/json",
      },
      body: JSON.stringify({
        auth: { id: CONFIG.companyId, apiKey: CONFIG.apiKey },
        model: { page: Number.isFinite(page) ? page : 0, count: CONFIG.pageSize },
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(502).json({ error: `API error ${upstream.status}: ${text.slice(0, 300)}` });
    }

    const data = await upstream.json();
    const items = Array.isArray(data)
      ? data
      : data?.data || data?.items || data?.leads || [];

    return res.status(200).json({
      items,
      hasMore: items.length >= CONFIG.pageSize,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected server error" });
  }
};
