# 融岗智训课程到终评详细全流程

该工程把真实 Web 操作录制作为主体，并用 HyperFrames 添加六个章节覆盖层、片头和片尾。

## 输入

- `assets/course-to-review-raw.mp4`：421 秒真实交互状态录制。
- `capture/`：八张代表性截图、时间轴接触表和采集摘要。

## 运行

```powershell
npm run check
npm run inspect -- --samples 18
npm run render -- --output renders/融岗智训-课程到终评详细全流程演示.mp4
```

已完成的工程门包括 HyperFrames `check` 0 个错误、运行时/布局/运动检查通过、15/15 文本对比度满足 WCAG AA，以及 `2 / 8 / 23 / 80 / 182 / 230 / 300 / 360 / 420 / 430` 秒十个代表性快照的视觉复核。最终成片经媒体探针确认为 H.264、yuv420p、1280×720、30 fps、434 秒、起始时间 0。

最终成片应保留真实的治理驳回与重做，不把模型建议包装成教师结论。
