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
    let items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data?.items)) {
      items = data.items;
    } else if (Array.isArray(data?.data)) {
      items = data.data;
    } else if (Array.isArray(data?.leads)) {
      items = data.leads;
    } else if (Array.isArray(data?.result)) {
      items = data.result;
    } else if (data && typeof data === "object") {
      const arrays = Object.values(data).filter((v) => Array.isArray(v));
      if (arrays.length) items = arrays.sort((a, b) => b.length - a.length)[0];
    }

    return res.status(200).json({
      items,
      hasMore: false,
      sourceUrl: url,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected server error" });
  }
};
