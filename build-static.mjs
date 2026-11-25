import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshSiteData, readSiteData } from '../lib/aggregate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');
const STATIC_FLAG = 'window.CHEMSCOPE_STATIC = true;\n';

async function main() {
  let data = null;

  // A failed fetch must not take the live site down. Keep the last committed
  // snapshot when the network or an upstream feed is unavailable.
  try {
    data = await refreshSiteData({ quiet: true });
  } catch (error) {
    console.warn(`[chemscope] 实时抓取失败，尝试使用已有快照：${error.message}`);
    data = await readSiteData();
    if (!data) throw error;
  }

  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.cp(PUBLIC_DIR, DIST_DIR, { recursive: true });

  const dataFile = path.join(DIST_DIR, 'data.js');
  const dataJs = await fs.readFile(dataFile, 'utf8');
  if (!dataJs.includes('window.CHEMSCOPE_STATIC')) {
    await fs.writeFile(dataFile, STATIC_FLAG + dataJs, 'utf8');
  }

  console.log(
    `[chemscope] 静态站点已生成：${data.stats.news} 条时事 / ` +
      `${data.stats.papers} 篇论文；live ${data.stats.liveNews}/${data.stats.livePapers}`
  );
  if (data.errors?.length) {
    console.warn(`[chemscope] 抓取警告：${data.errors.join('；')}`);
  }
}

main().catch((error) => {
  console.error(`[chemscope] 静态构建失败：${error.stack || error.message}`);
  process.exitCode = 1;
});
