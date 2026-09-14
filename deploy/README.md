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

## 阿里云完整系统

完整应用地址：[glzx.fallingfeather.cn](https://glzx.fallingfeather.cn/)。使用杭州轻量服务器 `1Panel-ehke`（47.99.130.142，2核2GiB），A记录TTL为600秒。主机Nginx提供静态网页，只有 `/api` 与 `/health` 转发到单个API容器的3001端口。已有的其他站点继续使用原配置。

HTTPS使用Let's Encrypt证书，当前证书到期时间为2026-12-13，`certbot-renew.timer`与Nginx重载钩子负责续签。配置模板见 [nginx.conf](nginx.conf)。静态资源从同一镜像的 `/app/apps/web/dist` 导出；容器只启动 [start-api.mjs](start-api.mjs)，不再额外运行Vite预览服务和pnpm启动进程。

### 构建与运行

使用Node 24、pnpm 11.9.0。Linux镜像由 [.github/workflows/hosted-image.yml](../.github/workflows/hosted-image.yml) 构建并检查启动；本地也可使用同一Dockerfile。模型缓存位于持久卷中的 `/data/models`，学习数据位于 `/data/runtime`。

```sh
docker build -f deploy/Dockerfile -t ganglian-zhixun .
docker run -d --name ganglian-zhixun --restart unless-stopped \
  --memory=1400m --memory-swap=3g \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  -p 127.0.0.1:3001:3001 -v ganglian-data:/data \
  --env-file /opt/ganglian-zhixun/server.env \
  -e HOST=0.0.0.0 -e PORT=3001 -e DATA_DIR=/data/runtime \
  -e STARTUP_RECOVERY_MODE=blocking \
  -e WEB_ALLOWED_ORIGINS=https://glzx.fallingfeather.cn,http://127.0.0.1:3001 \
  ganglian-zhixun
```

`server.env`为服务器专用配置，权限0600，包含当前验收使用的模型提供方、地址、模型名与凭据。密钥不进入镜像、静态网页或Git。不要复制本机的HOST、PORT、DATA_DIR。已缓存模型的演示实例使用 `HF_HUB_OFFLINE=1`，初次准备模型时需先取得对应模型文件。

当前2GiB实例另启用2GiB Swap，容器内存上限1400MiB、内存加Swap合计上限3GiB。Node旧生代上限768MiB；本地向量模型单次批量为8条、推理线程为1，查询和索引共用一个串行工作队列。错误仍返回调用方，不通过静默降级掩盖失败。

```dotenv
NODE_OPTIONS=--max-old-space-size=768
RONGGANG_AI025_BATCH_SIZE=8
OMP_NUM_THREADS=1
OPENBLAS_NUM_THREADS=1
MKL_NUM_THREADS=1
HF_HUB_OFFLINE=1
TOKENIZERS_PARALLELISM=false
```

### 课程资料与运行检查

专业资料在运行服务上通过正式API导入，并建立检索索引：

```sh
docker exec -e GANGLIAN_PREPARE_ORIGIN=http://127.0.0.1:3001 \
  ganglian-zhixun node scripts/prepare-course-library.mjs
curl --fail https://glzx.fallingfeather.cn/health
docker stats --no-stream ganglian-zhixun
```

2026-09-15已完成4份公开专业PDF在10个课程关联中的导入与5门课程索引；全部返回成功。降低内存后的容器没有在该流程中重启。三路并发向量请求实测均返回512维有限数值，约4秒完成；该次容器内存峰值约1.0GiB，结束后约567MiB。这是本次部署的有限负载验证，不代表课堂并发容量承诺。多人演示建议至少4GiB内存；语音、OCR和集中导入还需根据实际负载测试。

学生/教师演示登录入口均位于首页，账号与演示密码在登录页公开显示。生产模式使用Secure Cookie，必须通过HTTPS访问。服务重启后需重新登录；持久学习数据和知识库保留在卷内。

单实例为当前数据写入边界。常规更新先 `docker stop --time 30 ganglian-zhixun`，确认API完成关闭并释放数据目录租约，再切换镜像；不得启动两个实例同时写入同一卷。异常终止后先确认全部写入进程已停止，再用数据安全CLI检查租约。Docker PID重用可能使旧租约被识别为占用，不能只因PID相同就删除锁文件或重置学习数据。

2026-09-15收尾状态：HTTPS、学生登录、五课程目录、实训场景、作品草稿保存与索引准备已通过。在线模型尚未通过：一次现场调用记录为model_response_invalid，服务器直接模型请求在45秒后超时；该次场景回复来自确定性兜底，不能作为实时模型能力验收。教师复核与作品完整送审尚未完成线上验收。按用户要求停止继续扩展，当前交付为已上线且完成内存修复的演示环境，保留上述未通过项。
