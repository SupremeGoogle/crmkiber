// api/leads.js — Vercel Serverless Function
// Проксирует запросы к s20.online без CORS

const CONFIG = {
    baseUrl: "https://kiberonekaliningrad.s20.online",
    companyId: 18,
    apiKey: "28cba784-c049-11ed-8535-ac1f6b4782be",
    appKey: "674bacf20ee8960c86c55795bb76690d",
    pageSize: 500,
};

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();

    const page = parseInt(req.query.page || "0");

    try {
        const url = `${CONFIG.baseUrl}/v2api/${CONFIG.companyId}/lead/index`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": CONFIG.apiKey,
                "X-APP-KEY": CONFIG.appKey,
                Accept: "application/json",
            },
            body: JSON.stringify({
                auth: { id: CONFIG.companyId, apiKey: CONFIG.apiKey },
                model: { page, count: CONFIG.pageSize },
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            return res.status(502).json({ error: `API error ${response.status}: ${text.slice(0, 300)}` });
        }

        const data = await response.json();

        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data.data) items = data.data;
        else if (data.items) items = data.items;
        else if (data.leads) items = data.leads;

        return res.status(200).json({
            items,
            hasMore: items.length >= CONFIG.pageSize,
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}