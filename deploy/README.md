# 公开演示与完整后端

GitHub Pages 和 Sites 发布同一份学生端公开导览。导览共用正式档案组件，课程内容从当前课程包生成，包含三地区五课程、地图、人物设定与预设访谈片段、资料、私人笔记、作品草稿和 Markdown 导出。

公开导览不调用模型、不上传笔记、不提供教师评分或云端提交。浏览器存储与正式系统数据库彼此独立。所有场景在导览中可直接访问，不表示正式课程中的访问许可已经获得。

## 构建公开导览

使用 Node 24、pnpm 11.9.0，在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build:packages
node scripts/build-public-demo.mjs
```

产物在 `.local/public-student-demo/dist`。使用相对资源路径与 hash 导览地址，支持 GitHub Pages 仓库子路径。GitHub Actions 负责发布；Sites 使用同一产物建立单独的静态站点发布记录。

## 完整系统托管准备

完整 Node 后端、模型网关和持久化实现保留在源码中。目前没有托管账号／服务器，未宣称其已上线。

提供 `deploy/Dockerfile` 和 `deploy/start-hosted.mjs`，沿用正式启动器，供具备持久化磁盘的 Node／容器平台接入。当前环境没有 Docker，因此容器镜像尚未实际构建验证。

```sh
docker build -f deploy/Dockerfile -t ganglian-zhixun .
docker run --rm -p 4173:4173 -v ganglian-data:/data \
  -e WEB_ALLOWED_ORIGINS=https://你的完整系统域名 \
  ganglian-zhixun
```

部署条件：

- 单实例与持久化 `/data`；当前文件存储及目录租约不支持多副本同时写入。正常停止会释放租约，异常退出应按数据安全 CLI 核验旧进程后恢复。
- HTTPS 域名与 `WEB_ALLOWED_ORIGINS`。容器入口同时托管正式网页和 API 代理，保持认证 cookie 同源，不依赖第三方 cookie。
- 模型凭据通过托管平台的环境变量提供，不能放入前端或提交至仓库。未设置真实模型时仍按原有 deterministic 配置运行，不能当作实时模型验收。
- 正式演示身份中存在学生、教师与管理员角色。完整系统公网运行前应限制访问范围并完成独立访客身份和调用配额配置；勿将当前本机学习数据直接放入公开演示实例。

本轮公开源码是工作区可发布文件的快照，不携带本机 Git 历史、密钥、个人学习数据、依赖目录或临时日志；后续公开更新应从权威工作区重新导出并审查差异。
