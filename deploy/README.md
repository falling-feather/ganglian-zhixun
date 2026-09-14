# 公开演示与完整后端

## 在线地址

- [完整项目源码](https://github.com/falling-feather/ganglian-zhixun)
- [GitHub Pages 学生公开导览](https://falling-feather.github.io/ganglian-zhixun/)
- [Sites 学生公开导览](https://ganglian-student.fallensigh0901.chatgpt.site)

2026-09-13：优化版GitHub Pages发布流程成功，首页预加载WebP、五课程摘要和WebP类型HTTP检查通过；Sites第2版发布成功，访问范围仍为公开。完整后端没有部署到这两个站点。

GitHub Pages 和 Sites 发布同一份学生端公开导览。导览共用正式档案组件，课程内容从当前课程包生成，包含三地区五课程、地图、人物设定与预设访谈片段、资料、私人笔记、作品草稿和 Markdown 导出。

公开导览不调用模型、不上传笔记、不提供教师评分或云端提交。浏览器存储与正式系统数据库彼此独立。所有场景在导览中可直接访问，不表示正式课程中的访问许可已经获得。

## 构建公开导览

使用 Node 24、pnpm 11.9.0，在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build:packages
node scripts/build-public-demo.mjs
```

产物在 `.local/public-student-demo/dist`。使用相对资源路径与 hash 导览地址，支持 GitHub Pages 仓库子路径。GitHub Actions 负责发布；Sites 使用同一构建入口生成产物并建立单独的静态站点发布记录。

公开构建只处理导览实际引用的36份图片。原始PNG保留在源码中，发布时自动生成带内容指纹的WebP；场景和人物图集保留原尺寸，透明图层使用完整alpha质量，纸板纹理按实际用途缩至512×512。两个站点各自提供图片，无跨站图片依赖。

## 访问性能

图片优化由 `scripts/lib/public-images.mjs` 执行；编码结果按原图、参数和编码器版本缓存在本机构建目录，不改动原图。首页预加载约41KB的档案纹理，课程目录只含摘要；进入课程后才获取该课资料，返回已打开课程复用内存缓存。图片、目录及课程文件名包含内容指纹，避免更新后读到不匹配的旧缓存。场景图片加载和课程数据失败均有明确状态。

档案阵列仍为441份，最高绘制频率限制为30 FPS；运动继续按经过时间推进，局部暂停、抽出以及隐藏标签停止绘制保持原有规则。

2026-09-13在同一浏览器、1280×800、冷缓存、512 KiB/s下载与100 ms延迟下的一次受控对比：

| 指标 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 全部发布图片 | 83.12 MB | 9.44 MB |
| 首屏纹理 | 2.94 MB | 40.82 KB |
| 首页目录原始体积 | 375.98 KB | 3.64 KB |
| 首屏资源实际传输量 | 3.27 MB | 0.26 MB |
| 首屏就绪 | 7.64秒 | 1.74秒 |

以上是本机限速模拟结果，不代表所有网络下的GitHub Pages访问时长。GitHub线路、DNS和区域连接时延仍可能影响访问。已通过12项定向检查和浏览器回归：无初始课程全文请求、进入单课后加载、WebP图像实际解码、私人笔记恢复、作品导出、地图与窄屏操作。

## 完整系统托管准备

完整 Node 后端、模型网关和持久化实现保留在源码中。2026-09-15用户启动阿里云部署准备，本轮先完成域名基础配置，再指导完整应用部署。

已核对的目标是杭州轻量应用服务器 `1Panel-ehke`，公网IP `47.99.130.142`，2核2GiB内存、40GiB系统盘，应用镜像为1Panel 1.10.26。已在阿里云DNS新增 `glzx.fallingfeather.cn` 的A记录，默认线路、TTL 600秒、启用状态；公网DNS已返回目标IP。云端防火墙的TCP 80和443规则原本已启用。

完整应用尚未上线：当前HTTP返回301跳转到同域名HTTPS，HTTPS证书校验报域名不匹配。1Panel开启了自定义安全入口，普通 `/login` 无法访问；本轮未登录面板、配置新站点或申请证书。轻量控制台的域名关联向导未完成，不影响已生效的公网DNS记录。

提供 `deploy/Dockerfile` 和 `deploy/start-hosted.mjs`，沿用正式启动器，供具备持久化磁盘的 Node／容器平台接入。目标服务器已有Docker；这些配置仍是待验证方案，容器镜像尚未实际构建验证。

```sh
docker build -f deploy/Dockerfile -t ganglian-zhixun .
docker run -d --name ganglian-zhixun --restart unless-stopped \
  -p 127.0.0.1:4173:4173 -v ganglian-data:/data \
  --env-file .env.server \
  -e PORT=4173 \
  -e WEB_ALLOWED_ORIGINS=https://glzx.fallingfeather.cn \
  -e __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=glzx.fallingfeather.cn \
  ganglian-zhixun
```

上述命令在上传后的项目根目录执行，仍需完成服务器构建与运行验证。先准备 `.env.server`，仅放需要的服务端模型配置，例如 `MODEL_PROVIDER`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`；模型名称和凭据沿用最终验收配置。不要原样复制本机HOST、PORT和DATA_DIR。密钥不放进镜像、网页或公开仓库。

后续操作顺序：

1. 登录1Panel实际安全入口，确认现有Nginx/OpenResty由哪里管理，以及4173端口是否空闲。
2. 上传最终完整源码，使用现有Dockerfile构建并启动单实例。使用新建的 `ganglian-data` 持久卷，不迁入本机个人学习数据。先检查 `docker logs --tail 100 ganglian-zhixun` 和 `curl -fsS http://127.0.0.1:4173/health`。
3. 在现有网站服务中新增 `glzx.fallingfeather.cn` 站点，反向代理到应用4173端口。若1Panel/OpenResty采用主机网络，目标为 `http://127.0.0.1:4173`；若采用独立容器网络，应先确认同网络的服务地址，不将容器内的127.0.0.1误当作宿主机。保留Host、转发协议与客户端信息；模型请求按需要设置代理超时并关闭流式响应缓冲。
4. 为该子域名申请或绑定有效证书，并设置HTTP跳转HTTPS。可用1Panel的ACME/HTTP验证与自动续签；验证请求需要正确到达该站点。已有证书仅在覆盖本域名时复用。
5. 从外部网络验证HTTPS证书、`/health`、学生/教师登录、一次真实模型交互、作品提交与教师复核，再将HTTPS地址写入提交材料。

当前启动器使用Vite preview，已检查本机依赖支持 `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`，部署时仅放行目标域名。API生产模式设置Secure Cookie，因此HTTPS是完整登录验收的必要条件。2GiB实例的构建与多模态处理承载能力尚未实测，需以首次构建、运行内存和评委并发测试为准。

操作参考：[1Panel创建反向代理网站](https://1panel.cn/docs/v1/user_manual/websites/website_create/)、[证书申请](https://1panel.cn/docs/v1/user_manual/websites/certificate_create/)、[网站HTTPS设置](https://1panel.cn/docs/v1/user_manual/websites/website_config_basic/)。

部署条件：

- 单实例与持久化 `/data`；当前文件存储及目录租约不支持多副本同时写入。正常停止会释放租约，异常退出应按数据安全 CLI 核验旧进程后恢复。
- HTTPS 域名与 `WEB_ALLOWED_ORIGINS`。容器入口同时托管正式网页和 API 代理，保持认证 cookie 同源，不依赖第三方 cookie。
- 模型凭据通过托管平台的环境变量提供，不能放入前端或提交至仓库。未设置真实模型时仍按原有 deterministic 配置运行，不能当作实时模型验收。
- 正式演示身份中存在学生、教师与管理员角色。完整系统公网运行前应限制访问范围并完成独立访客身份和调用配额配置；勿将当前本机学习数据直接放入公开演示实例。

本轮公开源码是工作区可发布文件的快照，不携带本机 Git 历史、密钥、个人学习数据、依赖目录或临时日志；后续公开更新应从权威工作区重新导出并审查差异。
