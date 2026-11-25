const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 ChemScope/1.0';

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const pad = (n) => String(n).padStart(2, '0');

export function decodeEntities(input = '') {
  let s = String(input);
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', mdash: '—', ndash: '–',
    hellip: '…', middot: '·', copy: '©', reg: '®', trade: '™', deg: '°',
    plusmn: '±', times: '×', divide: '÷', micro: 'µ', alpha: 'α', beta: 'β',
  };
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const cp = parseInt(hex, 16);
    return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
  });
  s = s.replace(/&#(\d+);/g, (_, dec) => {
    const cp = parseInt(dec, 10);
    return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
  });
  s = s.replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m);
  return s;
}

export function cleanText(input = '') {
  if (!input) return '';
  let s = String(input);
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s.replace(/\s+/g, ' ').trim();
}

export function dateKey(value = '') {
  const s = String(value || '').trim();
  if (!s) return '';
  let m = s.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);
  if (m) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  }
  return '';
}

export function canonicalUrl(value = '') {
  try {
    const u = new URL(value);
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|spm|from|source|ref|share)/i.test(key)) u.searchParams.delete(key);
    }
    if (/\/detail\/[a-f0-9]{16,}\/news$/i.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/news$/, '');
    }
    return u.href.replace(/\/+$/, '');
  } catch {
    return String(value || '').trim();
  }
}

export function normalizeDoi(value = '') {
  const m = String(value || '').match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/i);
  if (!m) return '';
  return m[0].replace(/[.,;:)\]]+$/g, '').toLowerCase();
}

export function doiLink(doi = '') {
  return doi ? `https://doi.org/${doi}` : '';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchText(url, { timeout = 25000, retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
        headers: {
          'user-agent': UA,
          accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml,*/*;q=0.8',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(600 * (attempt + 1));
    }
  }
  throw lastError;
}

function pickTag(xml, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i');
    const m = xml.match(re);
    if (m && m[1]) return m[1];
  }
  return '';
}

function publishedFromContent(block) {
  const m = block.match(/Published online:\s*(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i);
  return m ? m[1] : '';
}

const RESEARCH_BLOCK =
  /author correction|correction to|publisher correction|editorial|news\s*&\s*views|books?\b|retraction|matters arising|correspondence|podcast|career|ghost chemicals|a word from|table of contents|front matter/i;

export function isResearchTitle(title = '') {
  return Boolean(title) && !RESEARCH_BLOCK.test(title) && title.trim().split(/\s+/).length >= 3;
}

const SCIENCE_CHEM =
  /catal|chem|polymer|material|battery|electrolyte|perovskite|zeolite|membrane|CO2|carbon|hydrogen|ammonia|electro|photo|synthesis|molecule|MOF|framework|plastic|recycl|biomass|enzyme|protein|drug|semiconductor|nanocrystal|surface|acid|solvent|reactor/i;

export const PAPER_FEEDS = [
  {
    id: 'nature-catalysis',
    journal: 'Nature Catalysis',
    short: 'Nat. Catal.',
    url: 'https://www.nature.com/natcatal.rss',
    weight: 25,
    max: 8,
  },
  {
    id: 'nature-chemistry',
    journal: 'Nature Chemistry',
    short: 'Nat. Chem.',
    url: 'https://www.nature.com/nchem.rss',
    weight: 24,
    max: 8,
  },
  {
    id: 'science',
    journal: 'Science',
    short: 'Science',
    url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science',
    weight: 26,
    max: 8,
    chemFilter: true,
  },
  {
    id: 'angewandte',
    journal: 'Angewandte Chemie',
    short: 'Angew. Chem.',
    url: 'https://onlinelibrary.wiley.com/feed/15213773/most-recent',
    weight: 21,
    max: 6,
  },
];

export function parseFeed(xml, feed) {
  const blocks = [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const items = [];
  for (const block of blocks) {
    const title = cleanText(pickTag(block, ['dc:title', 'title']));
    const linkTag = cleanText(pickTag(block, ['link']));
    const linkHref = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || '';
    const link = linkTag || linkHref;
    if (!title || !link) continue;
    if (!isResearchTitle(title)) continue;
    if (feed.chemFilter && !SCIENCE_CHEM.test(title)) continue;

    const dateRaw =
      pickTag(block, ['dc:date', 'pubDate', 'published', 'updated']) ||
      publishedFromContent(block);
    const date = dateKey(dateRaw);
    const doiRaw =
      pickTag(block, ['prism:doi', 'dc:identifier']) ||
      block.match(/doi\.org\/(10\.[^"<\s]+)/i)?.[1] ||
      link;
    const doi = normalizeDoi(doiRaw);
    const summary = cleanText(pickTag(block, ['description', 'summary', 'content:encoded']))
      .replace(/^.*?Published online:[^;]*;\s*/i, '')
      .replace(/doi:\s*10\.[^\s]+/i, '')
      .slice(0, 360);

    items.push({
      title,
      titleZh: '',
      link: link.startsWith('http') ? link : doiLink(doi),
      doi,
      journal: feed.journal,
      journalShort: feed.short,
      date,
      summary,
      sourceWeight: feed.weight,
      feedId: feed.id,
    });
  }
  return items.slice(0, feed.max || 8);
}

const CHEM_NEWS =
  /化工|石化|化学|材料|聚烯烃|乙烯|丙烯|芳烃|催化剂|涂料|胶黏剂|电子化学品|氢|绿氨|绿色甲醇|LNG|天然气|炼化|聚丙烯|聚乙烯|POE|PBE|碳纤维|有机硅|氟|树脂|橡胶|化肥|农药|锂电|电解液|光伏|储能|碳中和|环保|安全|园区|中试|装置|投产|开工|竣工|石化基地|新材料|生物基|可降解|塑料|循环|炼油|油气|煤化工|盐化工|精细化工|氟化工|硅化工|膜|添加剂|助剂|溶剂|工业气体|能源/i;

const NAV_TITLE =
  /^(首页|更多|登录|注册|订阅|广告|联系我们|关于我们|招聘|English|网站地图|客户端|官方微博|官方微信|视频|专题|直播|会议|论坛|展会|培训|报告|数据库|周刊|杂志|投稿|版权声明|免责声明|返回|上一页|下一页|首页\s*>)/i;

const NEWS_NOISE =
  /招聘|征订|运动会|工会|趣味|公告|通知|免责|广告|版权|订阅|公开信|致信|学习贯彻|主题党日|党课|表彰|慰问|联欢|茶话会|新春|中秋|国庆|春节|清明|端午|重阳|冲刺年底|精益管理|挖潜创效|全力攻坚/i;

function looksChemical(title = '') {
  return (
    CHEM_NEWS.test(title) &&
    !NAV_TITLE.test(title.trim()) &&
    !NEWS_NOISE.test(title) &&
    title.trim().length >= 8
  );
}

export const NEWS_SOURCES = [
  {
    id: 'chemnews',
    name: '中国化工信息周刊',
    url: 'https://www.chemnews.com.cn/',
    base: 'https://www.chemnews.com.cn',
    weight: 18,
    max: 10,
    linkPattern: /\/c\/20\d{2}-\d{2}-\d{2}\/\d+\.shtml/i,
  },
  {
    id: 'ccin',
    name: '中化新网',
    url: 'http://www.ccin.com.cn/',
    base: 'http://www.ccin.com.cn',
    weight: 20,
    max: 12,
    linkPattern: /\/detail\/[a-z0-9]+/i,
    enrich: true,
  },
  {
    id: 'sinopec',
    name: '中国石化新闻网',
    url: 'http://www.sinopecnews.com.cn/',
    base: 'http://www.sinopecnews.com.cn',
    weight: 16,
    max: 10,
    linkPattern: /\/content\/20\d{2}-\d{2}\/\d{2}\/content_\d+\.html/i,
  },
  {
    id: 'chinanews',
    name: '中国新闻网',
    url: 'https://www.chinanews.com.cn/rss/finance.xml',
    weight: 11,
    max: 8,
    rss: true,
  },
];

function extractDateFromUrl(url = '') {
  return dateKey(url);
}

function titleFromAnchor(raw = '') {
  return cleanText(raw)
    .replace(/^\s*20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\s+/g, '')
    .replace(/^[\s【\[]*(原创|独家|关注|聚焦|热点|深度|视频|组图)[\s】\]]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function enrichCcin(items) {
  const targets = items.slice(0, 12);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(4, targets.length) }, async () => {
    while (cursor < targets.length) {
      const item = targets[cursor];
      cursor += 1;
      try {
        const html = await fetchText(item.url, { timeout: 18000, retries: 1 });
        const h1 = cleanText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
        if (h1 && h1.length >= 6) {
          item.title = h1.replace(/^.*?[|｜]\s*/, '').trim();
        }
        const meta = html.match(/来源：中化新网[\s\S]{0,180}?(20\d{2}年\d{1,2}月\d{1,2}日)/);
        const date = dateKey(meta?.[1] || '');
        if (date) item.date = date;
        const body = html.match(/<div class="news-content-txt">([\s\S]*?)<\/div>/i)?.[1] || '';
        const summary = cleanText(body.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
        if (summary) item.summary = summary.slice(0, 180);
      } catch {
        // Keep the homepage title if the detail page cannot be reached.
      }
    }
  });
  await Promise.all(workers);
  return items;
}

function parseHomepage(html, source) {
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(html)))) {
    const href = m[2];
    if (!source.linkPattern.test(href)) continue;
    const title = titleFromAnchor(m[3]);
    if (!looksChemical(title)) continue;
    let url;
    try {
      url = new URL(href, source.base).href;
    } catch {
      continue;
    }
    const key = canonicalUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      url,
      date: extractDateFromUrl(url),
      summary: '',
      source: source.name,
      sourceId: source.id,
      sourceWeight: source.weight,
    });
    if (out.length >= source.max) break;
  }
  return out;
}

async function collectOneNewsSource(source) {
  if (source.rss) {
    const xml = await fetchText(source.url, { timeout: 25000, retries: 1 });
    const items = [];
    for (const block of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
      const title = cleanText(pickTag(block[0], ['title']));
      const link = cleanText(pickTag(block[0], ['link'])) || block[0].match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
      if (!title || !link || !looksChemical(title)) continue;
      const date = dateKey(pickTag(block[0], ['pubDate', 'dc:date']));
      const summary = cleanText(pickTag(block[0], ['description'])).slice(0, 180);
      items.push({
        title,
        url: link,
        date,
        summary,
        source: source.name,
        sourceId: source.id,
        sourceWeight: source.weight,
      });
    }
    return items.slice(0, source.max);
  }

  const html = await fetchText(source.url, { timeout: 25000, retries: 1 });
  let items = parseHomepage(html, source);
  if (source.enrich && items.length) items = await enrichCcin(items);
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return items.slice(0, source.max);
}

export async function collectNews() {
  const settled = await Promise.allSettled(NEWS_SOURCES.map((source) => collectOneNewsSource(source)));
  const items = [];
  const sources = [];
  settled.forEach((result, index) => {
    const source = NEWS_SOURCES[index];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
      sources.push({ id: source.id, name: source.name, ok: true, count: result.value.length });
    } else {
      sources.push({
        id: source.id,
        name: source.name,
        ok: false,
        count: 0,
        error: result.reason?.message || String(result.reason),
      });
    }
  });
  const seen = new Set();
  const unique = items.filter((item) => {
    const key = canonicalUrl(item.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { items: unique, sources };
}

async function mapLimit(items, limit, fn) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function enrichNatureTypes(items) {
  const natureItems = items.filter((item) => item.feedId.startsWith('nature'));
  await mapLimit(natureItems, 4, async (item) => {
    try {
      const html = await fetchText(item.link, { timeout: 22000, retries: 1 });
      const contentType = html.match(/"contentType"\s*:\s*"([^"]+)"/i)?.[1] || '';
      const legacy = html.match(/"webtrendsPrimaryArticleType"\s*:\s*"([^"]+)"/i)?.[1] || '';
      item.articleType = contentType || legacy;
      if (/news|highlight|correspondence|editorial/i.test(`${contentType} ${legacy}`)) {
        item.isHighlight = true;
      }
    } catch {
      item.articleType = item.articleType || '';
    }
  });
  return items;
}

export async function collectPapers() {
  const settled = await Promise.allSettled(
    PAPER_FEEDS.map(async (feed) => {
      const xml = await fetchText(feed.url, { timeout: 30000, retries: 2 });
      return parseFeed(xml, feed);
    })
  );
  const items = [];
  const sources = [];
  settled.forEach((result, index) => {
    const feed = PAPER_FEEDS[index];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
      sources.push({ id: feed.id, name: feed.journal, ok: true, count: result.value.length });
    } else {
      sources.push({
        id: feed.id,
        name: feed.journal,
        ok: false,
        count: 0,
        error: result.reason?.message || String(result.reason),
      });
    }
  });
  const verified = await enrichNatureTypes(items);
  const researchOnly = verified.filter((item) => !item.isHighlight);
  const seen = new Set();
  const unique = researchOnly.filter((item) => {
    const key = item.doi || canonicalUrl(item.link);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.sourceWeight - a.sourceWeight);
  for (const source of sources) {
    source.count = unique.filter((item) => item.feedId === source.id).length;
  }
  return { items: unique, sources };
}
