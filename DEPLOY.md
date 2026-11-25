# 部署到 GitHub Pages

目标：把网站放到 GitHub Pages，电脑关机后手机也能打开。页面是纯静态的，不需要服务器；GitHub Actions 每天北京时间 06:10 重新抓取数据并发布。

## 你需要准备

- 一个 GitHub 账号；
- 一个 **Public** 仓库（公开仓库的 GitHub Pages 免费）；
- 仓库默认分支叫 `main`（或 `master`，工作流两者都支持）。

## 方式 A：GitHub Desktop（推荐，最省事）

1. 在 GitHub 网页新建一个 Public 仓库，例如 `chemscope`，不要勾选 “Add a README file”。
2. 安装并登录 GitHub Desktop，选择 **File → Add local repository**，指向本机的 `chemscope` 文件夹。
3. 如果提示这不是 Git 仓库，点 **create a repository**，然后 Publish repository，选择刚建的仓库。
4. 提交并推送全部文件（`dist/` 和 `screenshots/` 可以不传）。
5. 打开仓库网页 → **Settings → Pages** → **Build and deployment → Source** 选择 **GitHub Actions**。
6. 打开 **Actions** 标签，选择 **Build and publish ChemScope**，点 **Run workflow**。
7. 等绿色勾出现，回到 **Settings → Pages**，页面会显示：
   `https://<你的用户名>.github.io/<仓库名>/`

## 方式 B：只用 GitHub 网页上传

1. 新建 Public 仓库，名字例如 `chemscope`。
2. 在仓库首页点 **Add file → Upload files**，把 `chemscope` 里的这些内容拖进去：
   - `public/`
   - `lib/`
   - `scripts/`
   - `data/`
   - `.github/`
   - `README.md`、`.gitignore`
   不需要上传 `dist/`、`screenshots/`、`server.mjs`、`start.bat`、`public-tunnel.bat`。
3. 如果网页上传不支持 `.github` 文件夹：在仓库点 **Add file → Create new file**，文件名填 `.github/workflows/pages.yml`，把本机 `chemscope/.github/workflows/pages.yml` 的内容完整粘贴进去，提交。
4. **Settings → Pages → Source** 选择 **GitHub Actions**。
5. **Actions → Build and publish ChemScope → Run workflow**，等完成。
6. 访问 `https://<你的用户名>.github.io/<仓库名>/`。

## 每天怎么更新

- 工作流里的定时是 `10 22 * * *`（UTC），对应北京时间每天 **06:10**。
- GitHub 的定时任务可能延迟几分钟到几十分钟，这是平台行为。
- 也可以在 Actions 页面手动点 **Run workflow** 立即重建。
- 静态版右上角不再显示“刷新”按钮；数据由 GitHub Actions 生成到 `public/data.js`，再发布到 Pages。

## 常见问题

**Actions 里构建失败，提示网络抓取失败？**
本项目有编辑精选兜底：即使新闻/期刊源暂时失败，仍会生成 12 条时事 + 10 篇论文的静态页面。看日志里的 `[chemscope]` 警告即可；如果完全没生成，重新运行一次工作流。

**Pages 打开是 404？**
确认 Settings → Pages 的 Source 是 **GitHub Actions**，并且 `deploy` job 成功；首次部署后等 1–2 分钟。

**仓库必须是 Public 吗？**
公开仓库最省事、免费。Private 仓库的 Pages 取决于 GitHub 套餐，不建议用来做公开站点。

**域名可以固定吗？**
`https://<用户名>.github.io/<仓库名>/` 是固定的；以后改仓库名会变。若要有自己的域名，可在 Pages 里绑定自定义域名。

**电脑关机后还能更新吗？**
能。更新由 GitHub 的服务器执行，不再依赖你的电脑。只有 GitHub Actions 或 GitHub Pages 服务本身故障时才会暂停。
