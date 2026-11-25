import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectNews, collectPapers, canonicalUrl, doiLink } from './sources.mjs';
import {
  NEWS_CURATION,
  PAPER_CURATION,
  autoNewsTitle,
  autoPaperTitle,
  normalizeTitle,
} from './curation.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_FILE = path.join(DATA_DIR, 'site.json');
const DATA_JS_FILE = path.join(PUBLIC_DIR, 'data.js');

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function ageInDays(date = '', now = new Date()) {
  if (!date) return 99;
  const then = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(then.getTime())) return 99;
  const diff = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function recencyPoints(date, now) {
  const days = ageInDays(date, now);
  if (days <= 1) return 100;
  if (days <= 3) return 86;
  if (days <= 7) return 66;
  if (days <= 14) return 42;
  if (days <= 30) return 18;
  return 0;
}

function inferNewsTag(title = '') {
  if (/AI|智能|数字|算力|大模型|机器人/i.test(title)) return '智能';
  if (/氢|绿|碳|回收|可持续|环保|低碳|循环/i.test(title)) return '绿色';
  if (/LNG|天然气|油气|炼化|原油|接收站|管道|能源/i.test(title)) return '能源';
  if (/项目|投产|开工|竣工|收购|加码|亿元|装置|园区|基地/i.test(title)) return '产业';
  return '材料';
}

function inferPaperTag(title = '') {
  if (/catal|electrochem|electrocat|electrosynth|photoenzyme|photoredox/i.test(title)) return '催化';
  if (/battery|lithium|perovskite|solar|hydrogen|ammonia|energy/i.test(title)) return '能源';
  if (/polymer|polypropylene|polystyrene|COF|framework/i.test(title)) return '高分子';
  if (/zeolit|material|membrane|nanocarbon|nanobelt/i.test(title)) return '材料';
  return '合成';
}

function newsHeat(item, now) {
  const points = recencyPoints(item.date, now);
  const base = 68 + points * 0.18 + Math.max(0, (item.sourceWeight || 14) - 11) * 0.45;
  const boost = /亿元|首次|首套|突破|投产|竣工|签约|开工|国产|全球|最长/.test(item.title) ? 4 : 0;
  const soft = /一席谈|专访|访谈|对话|观察|盘点|解读|评论|综述|侧记/.test(item.title) ? -4 : 0;
  return Number(clamp(base + boost + soft, 68, 92.5).toFixed(1));
}

function paperHeat(item, now) {
  const points = recencyPoints(item.date, now);
  const base = 71 + points * 0.16 + Math.max(0, (item.sourceWeight || 22) - 21) * 0.6;
  const boost = item.titleZh ? 2.5 : 0;
  return Number(clamp(base + boost, 71, 94.2).toFixed(1));
}

function curatedNews(now) {
  return NEWS_CURATION.map((item, index) => ({
    ...item,
    id: `news-c${String(index + 1).padStart(2, '0')}`,
    sourceId: 'curated',
    curated: true,
    live: false,
    heat: Number(item.heat.toFixed(1)),
    tag: item.tag || inferNewsTag(item.title),
    date: item.date || '',
    note: item.note || '',
  }));
}

function curatedPapers() {
  return PAPER_CURATION.map((item, index) => ({
    ...item,
    id: `paper-c${String(index + 1).padStart(2, '0')}`,
    title: item.titleEn,
    link: doiLink(item.doi),
    curated: true,
    live: false,
    tag: item.tag || inferPaperTag(item.titleEn),
    heat: Number(item.heat.toFixed(1)),
  }));
}

function mergeNews(liveItems, now) {
  const curated = curatedNews(now);
  const keys = new Set();
  for (const item of curated) {
    keys.add(canonicalUrl(item.url));
    keys.add(normalizeTitle(item.title));
  }
  const live = [];
  for (const item of liveItems) {
    const urlKey = canonicalUrl(item.url);
    const titleKey = normalizeTitle(item.title);
    if (keys.has(urlKey) || keys.has(titleKey)) continue;
    keys.add(urlKey);
    keys.add(titleKey);
    live.push({
      ...item,
      id: `news-l${live.length + 1}`,
      title: autoNewsTitle(item.title),
      curated: false,
      live: true,
      heat: newsHeat(item, now),
      tag: inferNewsTag(item.title),
      note: item.summary || '',
    });
  }
  return [...curated, ...live.slice(0, 4)].sort((a, b) => b.heat - a.heat).slice(0, 16);
}

function mergePapers(liveItems, now) {
  const curated = curatedPapers();
  const keys = new Set(curated.map((item) => item.doi).filter(Boolean));
  const live = [];
  for (const item of liveItems) {
    const key = item.doi || canonicalUrl(item.link);
    if (keys.has(key)) continue;
    keys.add(key);
    const titleZh = autoPaperTitle(item.title);
    live.push({
      ...item,
      id: `paper-l${live.length + 1}`,
      title: item.title,
      titleZh,
      titleEn: item.title,
      link: item.link || doiLink(item.doi),
      curated: false,
      live: true,
      heat: paperHeat({ ...item, titleZh }, now),
      tag: inferPaperTag(item.title),
      why: '',
    });
  }
  return [...curated, ...live].sort((a, b) => b.heat - a.heat).slice(0, 12);
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || '其他';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export async function buildSiteData({ now = new Date() } = {}) {
  let newsResult = { items: [], sources: [] };
  let paperResult = { items: [], sources: [] };
  const errors = [];

  try {
    newsResult = await collectNews();
  } catch (error) {
    errors.push(`时事源：${error.message}`);
  }
  try {
    paperResult = await collectPapers();
  } catch (error) {
    errors.push(`论文源：${error.message}`);
  }

  const news = mergeNews(newsResult.items, now);
  const papers = mergePapers(paperResult.items, now);

  return {
    version: 1,
    generatedAt: now.toISOString(),
    timezone: 'Asia/Shanghai',
    note: '热度为综合编辑评分，不是平台真实互动量。',
    stats: {
      news: news.length,
      papers: papers.length,
      liveNews: news.filter((item) => item.live).length,
      livePapers: papers.filter((item) => item.live).length,
      newsTags: countBy(news, 'tag'),
      paperTags: countBy(papers, 'tag'),
    },
    sources: {
      news: newsResult.sources,
      papers: paperResult.sources,
    },
    errors,
    news,
    papers,
  };
}

async function atomicWrite(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, content, 'utf8');
  await fs.rename(temp, file);
}

export async function writeSiteData(data) {
  const json = JSON.stringify(data, null, 2);
  await atomicWrite(SITE_FILE, `${json}\n`);
  const js = `window.CHEMSCOPE_DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};\n`;
  await atomicWrite(DATA_JS_FILE, js);
  return data;
}

export async function readSiteData() {
  try {
    const raw = await fs.readFile(SITE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data.news) && Array.isArray(data.papers)) return data;
  } catch {
    // Fall through to a fresh build.
  }
  return null;
}

export async function refreshSiteData({ now = new Date(), quiet = false } = {}) {
  const data = await buildSiteData({ now });
  await writeSiteData(data);
  if (!quiet) {
    console.log(
      `[chemscope] ${data.stats.news} 条时事 / ${data.stats.papers} 篇论文；` +
        `新增 ${data.stats.liveNews} / ${data.stats.livePapers}`
    );
    for (const source of [...data.sources.news, ...data.sources.papers]) {
      if (!source.ok) console.warn(`[chemscope] 源不可用: ${source.name} — ${source.error || 'unknown'}`);
    }
  }
  return data;
}

export async function ensureSiteData({ now = new Date() } = {}) {
  const existing = await readSiteData();
  if (existing) return existing;
  return refreshSiteData({ now });
}

export const paths = { ROOT, DATA_DIR, PUBLIC_DIR, SITE_FILE, DATA_JS_FILE };
