# 化见 ChemScope

一个每天更新的化工行业信息站：顶部是全宽的“中国化工的下一个五年”专题，把“十五五”规划、2026 年政府工作报告和中国化工行业的下一步放在一起看；下面左边是化工时事热搜，右边是全球前沿论文。

- 本机地址：<http://localhost:8787>
- 手机地址：同一 Wi-Fi 下，用电脑的局域网 IP 加 `:8787`，例如 `http://10.21.172.76:8787`
- 公网地址（临时）：<https://9a76324be0f5d3.app.lhr.life>
- 数据自动刷新：每天北京时间 **06:10**
- 热度口径：**综合编辑评分，不是微博、微信等平台的真实互动量**

## 怎么启动

双击 `start.bat`。窗口不要关，按 `Ctrl+C` 停止服务。

脚本会优先使用本机 DSH 自带的 Node，找不到时回退到系统 `node`。也可以在项目目录手动运行：

```bat
node server.mjs
```

如果 8787 端口被占用，可以换端口：

```bat
set PORT=8788
node server.mjs
```

## 手机怎么看

1. 电脑和手机连接同一个 Wi-Fi。
2. 启动服务后，窗口里会打印 `LAN` 地址，例如 `http://10.21.172.76:8787`。
3. 手机浏览器输入这个地址。
4. 如果 Windows 防火墙弹窗，选择“允许访问”，并勾选“专用网络”。

手机端是单栏排版，底部有“专题 / 时事 / 科研”三个快捷入口。

## 公网访问（临时演示）

当前临时公网地址：<https://9a76324be0f5d3.app.lhr.life>

它由 `localhost.run` 的反向 SSH 隧道提供，适合把今天的页面发给别人看。注意：

- 电脑和 `start.bat` 服务必须保持运行，隧道进程也不能关；
- 这是**临时域名**，隧道重启后会变化，不要把它当成永久官网；
- 如果要长期固定域名，建议部署到云服务器，或使用 Cloudflare Tunnel / 自有域名方案；
- 公网只暴露本站页面和数据接口，不暴露本地文件目录；

重开隧道：先确认 `start.bat` 已在运行，再双击 `public-tunnel.bat`，窗口里会打印新的 `https://...` 地址。

## 部署到 GitHub Pages（电脑关机也能看）

如果不想让自己的电脑一直开着，可以把站点部署到 GitHub Pages。部署后页面由 GitHub 托管，GitHub Actions 每天北京时间 **06:10** 自动抓取并发布；电脑关机不影响访问。

完整步骤见 [DEPLOY.md](DEPLOY.md)，简要流程：

1. 建一个 **Public** 仓库；
2. 上传本目录内容（不要传 `dist/`、`screenshots/`）；
3. **Settings → Pages → Source** 选 **GitHub Actions**；
4. **Actions → Build and publish ChemScope → Run workflow**；
5. 访问 `https://<你的用户名>.github.io/<仓库名>/`。

静态版的右上角不再显示“刷新”按钮，数据由工作流更新；这是正常的。首次构建和后续定时构建都在 GitHub 上执行，不需要本机服务。

## 每天更新什么

页面读取 `public/data.js`（本地服务同时提供 `data/site.json` 快照）；服务启动后按北京时间每天 06:10 刷新；本地版也可以点页面右上角“刷新”手动更新，一次大约 15–25 秒。GitHub Pages 静态版没有这个按钮，由 Actions 每天重建。

- 化工时事：**12 条编辑精选 + 4 条当日/近日自动收录**
- 全球前沿：**10 篇编辑精选 + 2 篇最新自动收录**
- 自动收录的条目会标“自动”；编辑精选保留中文精简标题、来源和一句为什么值得看
- 某个源临时失败时，保留上一次快照，不会把页面刷空

服务依赖电脑保持开机和联网。电脑关机或睡眠时网站不可访问；醒来后如果错过 06:10，可以手动点“刷新”。

## 热度怎么算

热度是站内阅读优先级，不是平台真实热度。综合四类信号：

| 信号 | 权重 | 说明 |
| --- | --- | --- |
| 来源权重 | 30% | 行业媒体、核心期刊、通讯社等分级 |
| 时效 | 25% | 越近越高，避免旧闻长期占榜 |
| 关注度 | 30% | 项目投资、技术突破、政策、产业事件等关键词 |
| 编辑判断 | 15% | 信息量、可验证性、对化工读者的价值 |

页面右上角“热度说明”里有同一套口径。

## 内容来源

**时事**

- 中国化工信息周刊：<https://www.chemnews.com.cn/>
- 中化新网（中国化工报）：<http://www.ccin.com.cn/>
- 中国石化新闻网：<http://www.sinopecnews.com.cn/>
- 中新网金融 RSS：<https://www.chinanews.com.cn/rss/finance.xml>

**论文**

- Nature Catalysis：<https://www.nature.com/natcatal.rss>
- Nature Chemistry：<https://www.nature.com/nchem.rss>
- Science：<https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science>
- Angewandte Chemie：<https://onlinelibrary.wiley.com/feed/15213773/most-recent>

论文条目优先跳到 DOI 或期刊原文。自动收录的论文如果未能可靠生成中文标题，会保留英文原题，不硬造标题。

## 顶部专题的依据

- [“十五五”规划纲要](https://www.fujian.gov.cn/zwgk/ztzl/wsyjg/xxzc/zwsc/202603/t20260318_7113069.htm)
- [2026 年政府工作报告](https://www.gdtzb.gov.cn/yw/zy/content/post_105982.html)
- [中国化工信息周刊：2026 年政府工作报告解读及化工行业发展战略启示](https://www.chemnews.com.cn/c/2026-04-02/773709.shtml)

专题里的“四条主线、六条赛道、企业行动清单”是**基于官方目标的编辑研判**，不是官方单列的化工行业指标。页面底部也标了这一点。

## 文件结构

```text
chemscope/
  server.mjs            HTTP 服务、API、每日 06:10 定时刷新
  scripts/
    build-static.mjs    生成 GitHub Pages 用的 dist/ 静态站点
  .github/
    workflows/pages.yml GitHub Actions 定时构建并发布 Pages
  lib/
    sources.mjs         新闻与期刊 RSS/网页抓取、解析、去噪
    curation.mjs        编辑精选、中文标题、热度和标签
    aggregate.mjs       合并打分、生成快照、原子写入
  data/
    site.json           当前数据快照
  dist/                 静态构建产物（不同步到 GitHub）
  public/
    index.html          页面结构与专题文案
    styles.css          响应式样式
    app.js              榜单渲染、筛选、刷新、移动端导航
    data.js             给静态打开准备的同一份数据
    favicon.svg
  screenshots/          桌面端与手机端预览
  start.bat             Windows 一键启动
  public-tunnel.bat     打开临时公网隧道
  DEPLOY.md             GitHub Pages 部署步骤
```

## 想改内容

- 改编辑精选、中文标题、热度：`lib/curation.mjs`
- 改抓取源、过滤规则：`lib/sources.mjs`
- 改合并和打分：`lib/aggregate.mjs`
- 改专题文案：`public/index.html`
- 改视觉：`public/styles.css`

改完前端文件刷新浏览器即可；改 `lib/` 后需要重启服务。想立即重建数据，可以点页面“刷新”，或运行：

```bat
node -e "import('./lib/aggregate.mjs').then(m => m.refreshSiteData()).then(r => console.log(r.stats))"
```

## 说明

- 本机/局域网版运行在你自己电脑上；公网版通过 `localhost.run` 临时隧道转发，电脑关机或隧道关闭后不可访问。
- GitHub Pages 版由 GitHub 托管，电脑关机也能访问；数据由 GitHub Actions 每天北京时间 06:10 更新，静态版没有手动“刷新”按钮。
- 新闻与论文的版权归原媒体/期刊所有，本站只做标题、短摘要和原文链接。
- 热度是编辑评分；排名用于阅读参考，不代表任何平台的真实传播数据。
