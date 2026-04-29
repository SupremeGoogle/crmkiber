const CONFIG = {
  baseUrl: process.env.BASE_URL || "https://kiberonekaliningrad.s20.online",
  companyId: Number(process.env.COMPANY_ID || "1"),
  csrfToken:
    process.env.CSRF_TOKEN ||
    "v8Nn4DTx25F8e6gwmWwnhNEnWc22ZzUgLHOZbymq4_-NlCq0QLi40E41mmbIAW3X43Eq_88ARmRYONUwb8aGkA==",
  csrfForm:
    process.env.CSRF_FORM ||
    "Cgs0Gx1PpbcUKg2c5hrnJgysGIMp-Hs2fqQWMk3CBIE4XHlPaQbG9iZkP8q3d611PvprsVCfCHIK71ptC65h7g==",
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

function decodeHtmlEntities(text) {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(text) {
  return decodeHtmlEntities(String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function parseLeadRowsFromHtml(html) {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const items = [];

  for (const row of rows) {
    const cells = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 3) continue;

    const cellText = cells.map(stripTags).filter(Boolean);
    const idMatch = row.match(/\/lead\/view\/(\d+)/i) || row.match(/\bID\D{0,3}(\d{2,})/i);
    const emailMatch = row.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
    const phoneMatch = row.match(/\+?\d[\d\s()\-]{7,}/g);

    const id = idMatch ? Number(idMatch[1]) : undefined;
    if (!id && !emailMatch && !phoneMatch) continue;

    const nameCandidate = cellText.find((t) => /[A-Za-zА-Яа-я]/.test(t) && !/@/.test(t) && !/^\+?\d[\d\s()\-]+$/.test(t));
    const statusCandidate = cellText.find((t) => /нов|акт|обраб|закр|отказ|new|active|close/i.test(t));

    items.push({
      id,
      name: nameCandidate || `Лид #${id || items.length + 1}`,
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0].trim() : null,
      status: statusCandidate || "—",
      source: "CRM report",
      date: null,
      _raw: cellText,
    });
  }

  return items;
}

function parseJsonBlobsFromHtml(html) {
  const items = [];
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
  const jsonCandidates = [];

  for (const script of scripts) {
    const text = script.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
    const matches = text.match(/\{[\s\S]{40,}\}|\[[\s\S]{40,}\]/g) || [];
    for (const m of matches) jsonCandidates.push(m);
  }

  for (const raw of jsonCandidates) {
    try {
      const obj = JSON.parse(raw);
      const arr = pickItemsFromAnyJson(obj);
      if (arr.length) items.push(...arr);
    } catch (_e) {
      // ignore malformed snippets
    }
  }

  return items;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const backUrl = encodeURIComponent(
      `${CONFIG.baseUrl}/company/${CONFIG.companyId}/lead/index?LeadSearch%5Bf_removed%5D=2`
    );
    const url = `${CONFIG.baseUrl}/company/${CONFIG.companyId}/report/lead-created?backUrl=${backUrl}`;

    const form = new URLSearchParams();
    form.set("_csrf", CONFIG.csrfForm);
    form.set("ReportForm[d1]", "01.12.2022");
    form.set("ReportForm[d2]", "30.04.2026");
    form.set("ReportForm[pipelines]", "");
    form.set("ReportForm[sort]", "1");
    form.set("ReportForm[is_skip_archive]", "0");
    form.set("export", "");

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        Origin: CONFIG.baseUrl,
        Referer: `${CONFIG.baseUrl}/company/${CONFIG.companyId}/lead/index?LeadSearch%5Bf_removed%5D=2`,
        Cookie: CONFIG.cookie,
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": CONFIG.csrfToken,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: form.toString(),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(502).json({ error: `API ${upstream.status}: ${text.slice(0, 300)}` });
    }

    const contentType = upstream.headers.get("content-type") || "";

    let items = [];
    let debug = {};
    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      items = pickItemsFromAnyJson(data);
      const topLevelKeys = data && typeof data === "object" ? Object.keys(data).slice(0, 20) : [];
      if (!items.length && typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          items = pickItemsFromAnyJson(parsed);
        } catch (_e) {
          // ignore
        }
      }
      debug = { mode: "json", totalKeys: topLevelKeys.length, keys: topLevelKeys, chosenItems: items.length };
    } else {
      const html = await upstream.text();
      items = parseLeadRowsFromHtml(html);
      if (!items.length) {
        items = parseJsonBlobsFromHtml(html);
      }
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      debug = {
        mode: "html",
        htmlSize: html.length,
        chosenItems: items.length,
        title: titleMatch ? stripTags(titleMatch[1]) : "",
        sample: stripTags(html).slice(0, 240),
      };
    }

    return res.status(200).json({
      items,
      hasMore: false,
      sourceUrl: url,
      debug,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected server error" });
  }
};
