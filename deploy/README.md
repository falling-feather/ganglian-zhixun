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
