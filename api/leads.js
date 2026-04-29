const CONFIG = {
  baseUrl: process.env.BASE_URL || "https://kiberonekaliningrad.s20.online",
  boardId: Number(process.env.BOARD_ID || "34"),
  resourceId: Number(process.env.RESOURCE_ID || "261"),
  branchId: String(process.env.BRANCH_ID || "1"),
  boardColor: process.env.BOARD_COLOR || "#006600",
  pageSize: Number(process.env.PAGE_SIZE || "500"),
  cookie:
    process.env.CRM_COOKIE ||
    "PHPSESSID=g5rl7p448vaputca6delp27h65; _csrf=93ef67846c9a5a5d282c7fa9a323ff0572e8add11c9e45313acad20df9788f7aa%3A2%3A%7Bi%3A0%3Bs%3A5%3A%22_csrf%22%3Bi%3A1%3Bs%3A32%3A%222WMTtIcA2N2VQmJS2Vs2ygsDtKL_Fleo%22%3B%7D; supportOnlineTalkID=08798423424f5bd02976401edc252a2c",
};

function leadScore(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return 0;
  let score = 0;
  if ("id" in record) score += 2;
  if ("name" in record || "clientName" in record || "firstName" in record || "lastName" in record) score += 2;
  if ("email" in record || "clientEmail" in record || "emails" in record) score += 1;
  if ("phone" in record || "clientPhone" in record || "phones" in record) score += 1;
  if ("status" in record || "statusName" in record || "leadStatus" in record) score += 1;
  if ("createdAt" in record || "dateAdd" in record || "date" in record || "updatedAt" in record) score += 1;
  return score;
}

function pickItemsFromAnyJson(data) {
  const queue = [data];
  const visited = new Set();
  let best = [];
  let bestScore = -1;

  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    if (visited.has(node)) continue;
    visited.add(node);

    if (Array.isArray(node)) {
      const sample = node.slice(0, 30);
      const score = sample.reduce((sum, item) => sum + leadScore(item), 0);
      const normalized = sample.length ? score / sample.length : 0;
      const weighted = normalized * 1000 + node.length;
      if (weighted > bestScore) {
        bestScore = weighted;
        best = node;
      }
      for (const item of sample) {
        if (item && typeof item === "object") queue.push(item);
      }
      continue;
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return Array.isArray(best) ? best : [];
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const query = encodeURIComponent(
      JSON.stringify({
        branch: CONFIG.branchId,
        LeadSearch: { f_removed: "2" },
      })
    );

    const url = `${CONFIG.baseUrl}/company/1/lead/board?id=${CONFIG.boardId}&color=${encodeURIComponent(
      CONFIG.boardColor
    )}&query=${query}&resource_id=${CONFIG.resourceId}`;

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Referer: `${CONFIG.baseUrl}/company/1/lead/index?LeadSearch%5Bf_removed%5D=2`,
        Cookie: CONFIG.cookie,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(502).json({ error: `API ${upstream.status}: ${text.slice(0, 300)}` });
    }

    const data = await upstream.json();
    const items = pickItemsFromAnyJson(data);
    const topLevelKeys = data && typeof data === "object" ? Object.keys(data).slice(0, 20) : [];

    return res.status(200).json({
      items,
      hasMore: false,
      sourceUrl: url,
      debug: {
        totalKeys: topLevelKeys.length,
        keys: topLevelKeys,
        chosenItems: items.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected server error" });
  }
};
