# 融岗智训流程演示

本目录保存 `ART-001 / V1.3.3` 与 `ART-002 / V1.3.6` 两轮展示资产。制作顺序固定为：先在真实 Web 页面执行学生、教师与管理员流程并录制，再把原始录屏作为 HyperFrames 底片添加片头、章节提示、角色说明与片尾。

## 目录

- `原始录制/Web端全流程原始录制.mp4`：Web 真实操作原片，约 72.47 秒，1280×720。
- `HyperFrames工程/`：可继续修改的 HyperFrames HTML 工程，内含脚本、分镜、设计约束、原始底片与验收快照。
- `HyperFrames工程/renders/融岗智训-全流程交互演示.mp4`：最终成片，79.2 秒，1280×720，30 fps，无配音。
- `原始录制/Web端课程到终评详细原始录制.mp4`：第二轮真实业务原片，421 秒，1280×720；从课程认领持续到教师 92.2 分终评与学生反馈。
- `HyperFrames详细全流程/`：第二轮独立合成工程，包含六章透明说明层、脚本、分镜、设计约束、代表性快照和底片。
- `HyperFrames详细全流程/renders/融岗智训-课程到终评详细全流程演示.mp4`：第二轮详细成片，7 分 14 秒，1280×720，30 fps，无配音。
- `成片/融岗智训-课程到终评详细全流程演示.mp4`：同一成片的便捷播放副本。

## 复核

在 `HyperFrames工程` 中执行：

```powershell
npx hyperframes@0.7.88 check .
npx hyperframes@0.7.88 inspect . --samples 15
npx hyperframes@0.7.88 preview --port 4567
```

在 `HyperFrames详细全流程` 中执行：

```powershell
npx hyperframes@0.7.88 check .
npx hyperframes@0.7.88 inspect . --at 2,8,23,80,182,230,300,360,420,430
npx hyperframes@0.7.88 snapshot . --at 2,8,23,80,182,230,300,360,420,430 --describe false
npx hyperframes@0.7.88 render . --output renders\融岗智训-课程到终评详细全流程演示.mp4 --quality standard --fps 30 --strict
```

演示是参赛原型的交互说明资产，不替代真实教学实证、正式参赛材料、Live 能力或官方评分证据。
