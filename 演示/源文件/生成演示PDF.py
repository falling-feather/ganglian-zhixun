# -*- coding: utf-8 -*-
"""生成《融岗智训 V2.4.9 全功能架构与交互演示手册》。

输入：演示/截图 下的真实浏览器截图。
输出：演示/融岗智训-V2.4.9-全功能架构与交互演示手册.pdf。
"""

from __future__ import annotations

import hashlib
import math
import re
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[2]
DEMO_DIR = ROOT / "演示"
SCREEN_DIR = DEMO_DIR / "截图"
TMP_DIR = ROOT / "tmp" / "pdfs" / "v249-crops"
OUT_PATH = DEMO_DIR / "融岗智训-V2.4.9-全功能架构与交互演示手册.pdf"
TMP_DIR.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 30

NAVY = colors.HexColor("#071A2A")
NAVY_2 = colors.HexColor("#0D2940")
BLUE = colors.HexColor("#146C94")
CYAN = colors.HexColor("#21C7D9")
CYAN_LIGHT = colors.HexColor("#DFF8FB")
GOLD = colors.HexColor("#E8B85A")
GOLD_LIGHT = colors.HexColor("#FFF4D8")
GREEN = colors.HexColor("#36B37E")
GREEN_LIGHT = colors.HexColor("#E4F7EF")
RED = colors.HexColor("#D95C59")
RED_LIGHT = colors.HexColor("#FCE9E7")
INK = colors.HexColor("#173042")
MUTED = colors.HexColor("#5D7485")
LINE = colors.HexColor("#CCD9E1")
PAPER = colors.HexColor("#F4F8FA")
WHITE = colors.white


def register_fonts() -> None:
    regular_candidates = [
        Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
    ]
    bold_candidates = [
        Path(r"C:\Windows\Fonts\msyhbd.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
    ]
    regular = next(path for path in regular_candidates if path.exists())
    bold = next(path for path in bold_candidates if path.exists())
    pdfmetrics.registerFont(TTFont("CN", str(regular), subfontIndex=0))
    pdfmetrics.registerFont(TTFont("CN-Bold", str(bold), subfontIndex=0))


register_fonts()
c = canvas.Canvas(str(OUT_PATH), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
c.setTitle("融岗智训 V2.4.9 全功能架构与交互演示手册")
c.setAuthor("融岗智训项目组")
c.setSubject("揭榜挂帅赛题 XA-202603 - 真实岗位世界、多智能体协作、证据评价与学习者数字分身")

page_no = 0


def wrap_lines(text: str, font: str, size: float, width: float) -> list[str]:
    result: list[str] = []
    for paragraph in str(text).split("\n"):
        if not paragraph:
            result.append("")
            continue
        line = ""
        for char in paragraph:
            trial = line + char
            if line and pdfmetrics.stringWidth(trial, font, size) > width:
                result.append(line.rstrip())
                line = char.lstrip() if char.isspace() else char
            else:
                line = trial
        if line:
            result.append(line.rstrip())
    return result


def draw_wrapped(
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    font: str = "CN",
    size: float = 10,
    leading: float | None = None,
    color=INK,
    max_lines: int | None = None,
) -> float:
    leading = leading or size * 1.45
    lines = wrap_lines(text, font, size, width)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        if lines:
            tail = lines[-1]
            lines[-1] = (tail[:-1] + "…") if len(tail) > 1 else "…"
    c.setFillColor(color)
    c.setFont(font, size)
    cursor = y
    for line in lines:
        c.drawString(x, cursor, line)
        cursor -= leading
    return cursor


def draw_bullets(items: list[str], x: float, y: float, width: float, *, size: float = 10, gap: float = 5) -> float:
    cursor = y
    for item in items:
        c.setFillColor(CYAN)
        c.circle(x + 4, cursor + 3, 2.2, fill=1, stroke=0)
        cursor = draw_wrapped(item, x + 14, cursor + 8, width - 14, size=size, leading=size * 1.45) - gap
    return cursor


def rounded_box(x: float, y: float, w: float, h: float, *, fill=WHITE, stroke=LINE, radius: float = 9, line_width: float = 0.8) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(line_width)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def pill(text: str, x: float, y: float, *, fill=CYAN_LIGHT, color=BLUE, size: float = 8.2, pad_x: float = 8) -> float:
    width = pdfmetrics.stringWidth(text, "CN-Bold", size) + pad_x * 2
    c.setFillColor(fill)
    c.roundRect(x, y, width, 18, 9, fill=1, stroke=0)
    c.setFillColor(color)
    c.setFont("CN-Bold", size)
    c.drawString(x + pad_x, y + 5.2, text)
    return width


def arrow(x1: float, y1: float, x2: float, y2: float, *, color=BLUE, width: float = 1.7) -> None:
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)
    angle = math.atan2(y2 - y1, x2 - x1)
    size = 6
    points = [
        (x2, y2),
        (x2 - size * math.cos(angle - 0.48), y2 - size * math.sin(angle - 0.48)),
        (x2 - size * math.cos(angle + 0.48), y2 - size * math.sin(angle + 0.48)),
    ]
    path = c.beginPath()
    path.moveTo(*points[0])
    path.lineTo(*points[1])
    path.lineTo(*points[2])
    path.close()
    c.drawPath(path, fill=1, stroke=0)


def begin_page(title: str = "", kicker: str = "", *, dark: bool = False) -> None:
    global page_no
    if page_no:
        c.showPage()
    page_no += 1
    c.setFillColor(NAVY if dark else PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    if dark:
        return
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 16, PAGE_W, 16, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(0, PAGE_H - 16, 185, 3, fill=1, stroke=0)
    if kicker:
        c.setFillColor(BLUE)
        c.setFont("CN-Bold", 8.4)
        c.drawString(MARGIN, PAGE_H - 38, kicker)
    if title:
        c.setFillColor(NAVY)
        c.setFont("CN-Bold", 20)
        c.drawString(MARGIN, PAGE_H - 64, title)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, 27, PAGE_W - MARGIN, 27)
    c.setFillColor(MUTED)
    c.setFont("CN", 7.5)
    c.drawString(MARGIN, 14, "融岗智训 V2.4.9 | DOC-011 | 真实浏览器证据 + 当前代码事实")
    c.drawRightString(PAGE_W - MARGIN, 14, f"{page_no:02d}")


def card_title_body(x: float, y: float, w: float, h: float, title: str, body: str, *, accent=CYAN, fill=WHITE, body_size: float = 9.2) -> None:
    rounded_box(x, y, w, h, fill=fill)
    c.setFillColor(accent)
    c.rect(x, y, 4, h, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 11.5)
    c.drawString(x + 16, y + h - 24, title)
    draw_wrapped(body, x + 16, y + h - 43, w - 30, size=body_size, leading=body_size * 1.45, color=MUTED)


def draw_image_fit(path: Path, x: float, y: float, w: float, h: float, *, border: bool = True) -> None:
    with Image.open(path) as im:
        iw, ih = im.size
    ratio = min(w / iw, h / ih)
    dw, dh = iw * ratio, ih * ratio
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    if border:
        rounded_box(x, y, w, h, fill=colors.HexColor("#EAF1F5"), stroke=LINE, radius=8)
    c.drawImage(ImageReader(str(path)), dx, dy, dw, dh, preserveAspectRatio=True, mask="auto")


def crop_path(path: Path, ratio: float, focus: float) -> Path:
    digest = hashlib.sha256(f"{path.name}:{ratio:.4f}:{focus:.3f}".encode("utf-8")).hexdigest()[:16]
    target = TMP_DIR / f"{path.stem}-{digest}.jpg"
    if target.exists():
        return target
    with Image.open(path) as im:
        rgb = im.convert("RGB")
        iw, ih = rgb.size
        target_h = min(ih, int(iw / ratio))
        max_top = max(0, ih - target_h)
        top = int(max_top * max(0.0, min(1.0, focus)))
        cropped = rgb.crop((0, top, iw, top + target_h))
        cropped.save(target, "JPEG", quality=90, optimize=True)
    return target


def draw_evidence_image(path: Path, x: float, y: float, w: float, h: float, focus: float) -> None:
    with Image.open(path) as im:
        iw, ih = im.size
    aspect = iw / ih
    rounded_box(x, y, w, h, fill=colors.HexColor("#DCE8EE"), stroke=LINE, radius=9)
    pad = 7
    if aspect >= 1.25:
        draw_image_fit(path, x + pad, y + pad, w - 2 * pad, h - 2 * pad, border=False)
        return
    main_w = w * 0.79
    thumb_w = w - main_w - pad * 3
    main_h = h - pad * 2
    cropped = crop_path(path, main_w / main_h, focus)
    c.drawImage(ImageReader(str(cropped)), x + pad, y + pad, main_w, main_h, preserveAspectRatio=True, mask="auto")
    c.setFillColor(NAVY_2)
    c.roundRect(x + pad * 2 + main_w, y + pad, thumb_w, main_h, 4, fill=1, stroke=0)
    with Image.open(path) as im:
        tw, th = im.size
    tr = min((thumb_w - 8) / tw, (main_h - 8) / th)
    dw, dh = tw * tr, th * tr
    c.drawImage(
        ImageReader(str(path)),
        x + pad * 2 + main_w + (thumb_w - dw) / 2,
        y + pad + (main_h - dh) / 2,
        dw,
        dh,
        preserveAspectRatio=True,
        mask="auto",
    )


def evidence_page(item: dict) -> None:
    begin_page(item["title"], f"真实交互节点 {item['id']:02d} / 48 · {item['stage']}")
    image_path = SCREEN_DIR / item["file"]
    draw_evidence_image(image_path, MARGIN, 74, 538, 425, item.get("focus", 0.0))
    panel_x, panel_y, panel_w, panel_h = 585, 74, PAGE_W - 615, 425
    rounded_box(panel_x, panel_y, panel_w, panel_h, fill=WHITE)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 10)
    c.drawString(panel_x + 14, panel_y + panel_h - 22, f"截图 {item['id']:02d}")
    pill(item["status"], panel_x + 78, panel_y + panel_h - 29, fill=item.get("pill_fill", CYAN_LIGHT), color=item.get("pill_color", BLUE), size=7.5)
    sections = [
        ("用户交互", item["action"], CYAN),
        ("后台协作", item["system"], BLUE),
        ("权威结果", item["result"], GREEN),
        ("验证点", item["proof"], GOLD),
    ]
    cursor = panel_y + panel_h - 55
    for label, body, accent in sections:
        c.setFillColor(accent)
        c.setFont("CN-Bold", 8.8)
        c.drawString(panel_x + 14, cursor, label)
        cursor -= 14
        cursor = draw_wrapped(body, panel_x + 14, cursor, panel_w - 28, size=8.35, leading=11.4, color=MUTED, max_lines=5)
        cursor -= 10
    c.setFillColor(MUTED)
    c.setFont("CN", 6.8)
    c.drawRightString(PAGE_W - MARGIN, 33, item["file"])


# ---------------------------------------------------------------------------
# 封面与阅读说明
# ---------------------------------------------------------------------------

begin_page(dark=True)
c.setFillColor(CYAN)
c.rect(0, PAGE_H - 18, PAGE_W, 5, fill=1, stroke=0)
c.setFillColor(colors.HexColor("#0A2337"))
c.circle(105, 105, 180, fill=1, stroke=0)
c.setFillColor(colors.HexColor("#0E3149"))
c.circle(760, 520, 250, fill=1, stroke=0)
c.setFillColor(CYAN)
c.setFont("CN-Bold", 10)
c.drawString(48, PAGE_H - 60, "XA-202603 · 职业教育高水平专业群教学实训与岗位技能智能体")
c.setFillColor(WHITE)
c.setFont("CN-Bold", 34)
c.drawString(48, PAGE_H - 116, "融岗智训")
c.setFont("CN-Bold", 22)
c.drawString(48, PAGE_H - 151, "V2.4.9 全功能架构与交互演示手册")
c.setFillColor(GOLD)
c.setFont("CN-Bold", 13)
c.drawString(48, PAGE_H - 188, "真实岗位世界 · 事件驱动智能体群 · 证据评价 · 学习者数字分身")
draw_wrapped(
    "一条可复算的旗舰黄金链：从真实空态、课程认领和自由行动，经过必要智能体选择、知识接地、灰度冲突、教师门、媒体与七项作品，再到六维终裁、自适应第二场和管理员全链审计。",
    48,
    PAGE_H - 230,
    410,
    size=11.2,
    leading=17,
    color=colors.HexColor("#C6DDE8"),
)
draw_image_fit(SCREEN_DIR / "08-教师导演台业务因果与风险门.png", 486, 236, 320, 235)
draw_image_fit(SCREEN_DIR / "30-学生终裁结果与学习者数字分身.png", 568, 50, 238, 168)
pill("77页结构化演示", 48, 92, fill=colors.HexColor("#123C53"), color=CYAN, size=9)
pill("48份真实页面证据", 178, 92, fill=colors.HexColor("#123C53"), color=CYAN, size=9)
pill("确定性可复算", 326, 92, fill=colors.HexColor("#123C53"), color=CYAN, size=9)
c.setFillColor(colors.HexColor("#9BB7C6"))
c.setFont("CN", 8.5)
c.drawString(48, 44, "产品能力基线 V2.4.7 · 工程治理 V2.4.8 · 演示文档 V2.4.9 · 2026-09-02")
c.drawRightString(PAGE_W - 36, 44, "真实浏览器运行证据，不以数据库编辑伪造结果")

begin_page("如何阅读这份手册", "阅读说明 · 事实、演示与边界分开")
card_title_body(30, 317, 245, 170, "先看架构", "第 5-20 页说明系统分层、事件波、六组十四智能体、三权分离、恢复、模型边界、评价和学习者数字分身。", accent=CYAN)
card_title_body(298, 317, 245, 170, "再看真实链路", "第 21-68 页逐节点展示用户动作、后台协作、权威结果和可核验页面证据，全部来自同一隔离演示数据。", accent=GREEN)
card_title_body(566, 317, 245, 170, "最后看证明边界", "末章集中列出自动化结果、已知缺口、启动入口、版本历史、接口版本和截图索引。", accent=GOLD)
rounded_box(30, 76, 781, 215, fill=WHITE)
c.setFillColor(NAVY)
c.setFont("CN-Bold", 13)
c.drawString(48, 262, "证据等级")
draw_bullets([
    "页面证据：截图来自真实生产构建和服务端状态，不是设计稿或静态拼图。",
    "工程证据：V2.4.7 的冻结门为 1281 passed / 7 skipped，fresh Chromium 13/13；本手册不会把它说成教学效果。",
    "模型证据：受控 DeepSeek 合同冒烟曾为 6/6；本次截图使用 deterministic，讯飞星辰仍缺已发布工作流收据。",
    "外部证据：36 条知识仍待专业教师复核，A/B/C 实际消融观察仍为 0，不能宣称量规有效或架构普遍优越。",
], 48, 235, 730, size=10.2, gap=6)

begin_page("一句话产品主张", "赛题对齐 · 从“聊天机器人”转为“岗位世界”")
rounded_box(45, 220, 752, 230, fill=NAVY, stroke=NAVY)
draw_wrapped(
    "学生以记者身份进入一个持续运行的真实岗位世界：事件与人物制造专业冲突，必要智能体在后台协作但不能越权；学生的真实行动、作品、证据与后果形成六维评价，经教师终裁后更新证据约束的学习者数字分身，并在双同意下生成机制真正变化的下一场训练。",
    76,
    405,
    690,
    font="CN-Bold",
    size=18,
    leading=31,
    color=WHITE,
)
pill("不是通用问答", 98, 155, fill=RED_LIGHT, color=RED, size=10)
pill("不是一键生成作品", 250, 155, fill=RED_LIGHT, color=RED, size=10)
pill("不是模型直接写世界", 424, 155, fill=RED_LIGHT, color=RED, size=10)
pill("不是人格复制", 613, 155, fill=RED_LIGHT, color=RED, size=10)
draw_wrapped("核心创新不在“同时调用多少模型”，而在可验证的世界状态、必要子集协作、正式写入权、证据评价和跨场成长闭环。", 95, 115, 650, font="CN-Bold", size=12, color=BLUE)

begin_page("当前交付结论", "V2.4.7 产品能力 + V2.4.8 工程治理 + V2.4.9 演示证据")
columns = [
    ("真实岗位世界", "泉州蟳埔五幕 55 分钟；10 名 NPC、32 个主动计划、3 段关键人物九种合法结局、两组灰度冲突、四条发布后回应弧。", CYAN),
    ("智能体与权威", "六组十四 baseline，按受影响集合选择必要子集；模型只产候选，WorldEngine 与教师门保有正式写入权。", BLUE),
    ("作品与评价", "七项文字成果、图音视频送审包、父版本和双 hash；证据不足不出分，教师基于同源证据终裁。", GREEN),
    ("个性化成长", "证据约束的学习者数字分身、申诉、3-7 级挑战候选、学生同意 + 教师授权的真实第二场。", GOLD),
    ("工程可复验", "不可变会话代际、跨 Store 收据和 Outbox 恢复、三角色投影、13 工作区、fresh E2E 与升级演练。", colors.HexColor("#8A64D6")),
    ("诚实边界", "没有专业教师外审、教学效果、真实消融优势、星辰发布实例或无限开放对话，不以页面数量替代赛题价值。", RED),
]
for i, (title, body, accent) in enumerate(columns):
    col = i % 3
    row = i // 3
    card_title_body(30 + col * 268, 295 - row * 205, 245, 175, title, body, accent=accent, body_size=9.6)

begin_page("三类角色，各看各的业务", "渐进披露 · 技术复杂度不转嫁给普通用户")
role_cards = [
    ("学生 / reporter", "唯一当前任务\n现场人物与环境\n一条当前建议\n作品与证据\n评价、申诉、下一场", "看见高仿真世界，不看 Prompt / Trace / 供应方", CYAN),
    ("教师 / teacher", "世界事件\n受影响集合\n学生选择\n教师门\n同源证据终裁", "看业务因果，不看模型私有思维或后台噪声", GOLD),
    ("管理员 / operator", "六组十四拓扑\nTask / Run / Intent\n失败与降级\nOutbox / 恢复\n消融与质量门", "独占技术审计，可重新认证体验角色但不能代写事实", GREEN),
]
for i, (title, list_text, note, accent) in enumerate(role_cards):
    x = 42 + i * 266
    rounded_box(x, 132, 238, 330, fill=WHITE)
    c.setFillColor(accent)
    c.circle(x + 38, 416, 22, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 14)
    c.drawString(x + 72, 411, title)
    draw_wrapped(list_text, x + 24, 365, 190, font="CN-Bold", size=12, leading=29, color=INK)
    c.setFillColor(colors.HexColor("#E7EEF2"))
    c.rect(x + 18, 176, 202, 1, fill=1, stroke=0)
    draw_wrapped(note, x + 24, 158, 190, size=9.2, leading=14, color=MUTED)

# ---------------------------------------------------------------------------
# 架构图
# ---------------------------------------------------------------------------

begin_page("系统分层与依赖方向", "架构图 1 · 所有正式后果回到一套权威世界")
layers = [
    ("角色体验层", "Student / Teacher / Admin React pages", CYAN_LIGHT, BLUE),
    ("角色安全投影", "Cookie + CSRF + RoleBinding + strict DTO", colors.HexColor("#E8F0FF"), BLUE),
    ("六个组合根", "course / world / work / assessment / adaptation / operations", colors.HexColor("#EEF0FA"), colors.HexColor("#6D63B8")),
    ("候选与策略平面", "Semantic / Grounded / Dialogue / Quality / Learner candidate", GOLD_LIGHT, colors.HexColor("#A16F16")),
    ("权威结算平面", "WorldEngine + TeacherGate + EvidenceAuthority", GREEN_LIGHT, GREEN),
    ("持久与恢复", "JSONL + content-addressed objects + Receipt + Outbox + checkpoints", RED_LIGHT, RED),
]
for i, (name, detail, fill, accent) in enumerate(layers):
    y = 438 - i * 67
    rounded_box(103, y, 635, 48, fill=fill, stroke=accent)
    c.setFillColor(accent)
    c.setFont("CN-Bold", 11)
    c.drawString(121, y + 28, name)
    c.setFillColor(INK)
    c.setFont("CN", 9.2)
    c.drawString(270, y + 28, detail)
    if i < len(layers) - 1:
        arrow(420, y - 2, 420, y - 17, color=MUTED, width=1.2)
draw_wrapped("依赖只能向下；浏览器、模型和智能体都不能绕过权威结算平面直接修改世界、证据、总分或挑战上限。", 118, 67, 610, font="CN-Bold", size=10.5, color=BLUE)

begin_page("事件波与必要子集协作", "架构图 2 · 一次事件不等于十四个智能体全量并发")
flow = [
    ("WorldEvent", "世界事实 + stateVersion"),
    ("Affected Set", "受影响对象 + 候选集合"),
    ("DispatchPlan", "selected / skipped + 业务理由"),
    ("Task / Run", "Observation → Intent"),
    ("Policy", "引用 / 权限 / 风险 / 预算"),
    ("Resolution", "学生选择或教师门"),
    ("WorldEvent +1", "正式后果与证据"),
]
for i, (name, detail) in enumerate(flow):
    x = 28 + i * 114
    rounded_box(x, 305, 98, 105, fill=WHITE, stroke=CYAN if i < 4 else GOLD)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 9.2)
    c.drawCentredString(x + 49, 376, name)
    draw_wrapped(detail, x + 10, 348, 78, size=7.8, leading=11, color=MUTED, max_lines=4)
    if i < len(flow) - 1:
        arrow(x + 99, 357, x + 112, 357, color=BLUE, width=1.3)
rounded_box(70, 105, 300, 135, fill=CYAN_LIGHT, stroke=CYAN)
draw_wrapped("选中节点", 90, 215, 260, font="CN-Bold", size=12, color=BLUE)
draw_bullets(["必须受本事件影响", "必须具备合法输入引用", "必须在波预算内", "失败可降级且不得造后果"], 90, 188, 250, size=9)
rounded_box(472, 105, 300, 135, fill=GOLD_LIGHT, stroke=GOLD)
draw_wrapped("跳过节点", 492, 215, 260, font="CN-Bold", size=12, color=colors.HexColor("#9A6812"))
draw_bullets(["逐节点保留业务跳过理由", "教师可看到为什么未唤醒", "管理员可审计完整决策", "无关调用计入消融指标"], 492, 188, 250, size=9)

begin_page("六组十四智能体运行拓扑", "架构图 3 · baseline 拓扑由服务端 Manifest 动态输出")
groups = [
    ("教学与情境导演 / 2", ["教学导演", "情境导演"], colors.HexColor("#DFF8FB"), CYAN),
    ("采编与协作 / 2", ["采访对象", "责任编辑"], colors.HexColor("#E7F0FF"), BLUE),
    ("事实核查 / 1", ["事实核查"], colors.HexColor("#E7F7EE"), GREEN),
    ("内容治理 / 4", ["版权方", "版权治理", "内容安全", "平台规则"], colors.HexColor("#FFF4D8"), GOLD),
    ("运营与分发 / 1", ["平台运营"], colors.HexColor("#F1EAFB"), colors.HexColor("#8661B8")),
    ("评价与学习迁移 / 4", ["证据充分性", "作品质量", "职业协作", "学习迁移"], colors.HexColor("#FCE9E7"), RED),
]
for i, (name, agents, fill, accent) in enumerate(groups):
    col, row = i % 3, i // 3
    x, y = 35 + col * 268, 294 - row * 205
    rounded_box(x, y, 242, 170, fill=fill, stroke=accent)
    c.setFillColor(accent)
    c.setFont("CN-Bold", 11)
    c.drawString(x + 16, y + 142, name)
    for j, agent in enumerate(agents):
        pill(agent, x + 16 + (j % 2) * 103, y + 99 - (j // 2) * 41, fill=WHITE, color=INK, size=8.5, pad_x=9)
    c.setFillColor(MUTED)
    c.setFont("CN", 7.4)
    c.drawString(x + 16, y + 18, "Task → Run → Observation → Intent")

begin_page("持久 NPC 与世界状态循环", "架构图 4 · 人物不是一次性文案模板")
nodes = [
    ("局部 Observation", 85, 352, CYAN_LIGHT, BLUE),
    ("目标 / 关系 / 承诺", 292, 420, GOLD_LIGHT, GOLD),
    ("私有记忆与公开事实", 515, 352, colors.HexColor("#EEEAF8"), colors.HexColor("#7B65AE")),
    ("合法计划候选", 515, 195, GREEN_LIGHT, GREEN),
    ("受约束回应 / Intent", 292, 132, colors.HexColor("#E8F0FF"), BLUE),
    ("Resolver + WorldEngine", 85, 195, RED_LIGHT, RED),
]
for title, x, y, fill, accent in nodes:
    rounded_box(x, y, 185, 66, fill=fill, stroke=accent)
    c.setFillColor(accent)
    c.setFont("CN-Bold", 10)
    c.drawCentredString(x + 92.5, y + 37, title)
for (sx, sy, tx, ty) in [(270,385,292,445),(477,445,515,385),(607,352,607,261),(515,228,477,165),(292,165,270,228),(177,261,177,352)]:
    arrow(sx, sy, tx, ty, color=MUTED, width=1.4)
rounded_box(275, 267, 290, 83, fill=NAVY, stroke=NAVY)
draw_wrapped("门卫、传承人、商户三段关键人物以 DialogueEpisode 保存议题、事实披露、关系、承诺、时间和请求收据。九种合法结局仍由世界规则结算。", 295, 322, 250, size=9, leading=13, color=WHITE)

begin_page("三权分离：候选、正式写入、教学终裁", "架构图 5 · 防止模型越权的核心安全设计")
rights = [
    ("候选权", "模型 / NPC / 专业智能体", "提出结构化候选、建议、Finding、预测", "不能写世界、造证据、给总分", CYAN),
    ("正式写入权", "WorldEngine + EvidenceAuthority", "校验命令、状态版本、引用、权限并追加事实", "不能替教师做教学判断", GREEN),
    ("教学终裁权", "真实教师 + 教师门", "批准高风险后果、复核同源证据、授权第二场", "不能改写学生历史行为和作品", GOLD),
]
for i, (right, owner, can, cannot, accent) in enumerate(rights):
    x = 42 + i * 266
    rounded_box(x, 150, 238, 315, fill=WHITE, stroke=accent)
    c.setFillColor(accent)
    c.circle(x + 119, 418, 25, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 15)
    c.drawCentredString(x + 119, 367, right)
    c.setFont("CN-Bold", 10)
    c.drawCentredString(x + 119, 340, owner)
    c.setFillColor(GREEN)
    c.setFont("CN-Bold", 8.5)
    c.drawString(x + 18, 298, "允许")
    draw_wrapped(can, x + 18, 280, 200, size=9.2, leading=14, color=MUTED)
    c.setFillColor(RED)
    c.setFont("CN-Bold", 8.5)
    c.drawString(x + 18, 220, "禁止")
    draw_wrapped(cannot, x + 18, 202, 200, size=9.2, leading=14, color=MUTED)

begin_page("六个显式组合根", "架构图 6 · 将超大 server 主链拆为可审计边界")
roots = [
    ("course", "课程目录 / 认领 / 发布引用"),
    ("world", "动作 / 事件 / 人物 / 教师门"),
    ("work", "文字 / 媒体 / 权利 / 版本"),
    ("assessment", "证据门 / 六维判断 / 终裁"),
    ("adaptation", "学习者模型 / 申诉 / 第二场"),
    ("operations", "拓扑 / Trace / 收据 / 质量门"),
]
for i, (name, detail) in enumerate(roots):
    col, row = i % 3, i // 3
    x, y = 42 + col * 266, 300 - row * 175
    rounded_box(x, y, 238, 145, fill=WHITE, stroke=CYAN if row == 0 else GOLD)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 15)
    c.drawString(x + 18, y + 105, name)
    draw_wrapped(detail, x + 18, y + 78, 202, size=10, leading=15, color=MUTED)
    c.setFillColor(colors.HexColor("#EAF1F5"))
    c.rect(x + 18, y + 29, 202, 1, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.setFont("CN", 8)
    c.drawString(x + 18, y + 14, "显式依赖 · 独立授权 · 独立恢复")

begin_page("跨 Store 收据、Outbox 与恢复", "架构图 7 · 不用“前半成功、后半丢失”换取假闭环")
stages = [
    ("prepare", "冻结 requestHash 与预期阶段"),
    ("authority commit", "写入世界 / 作品 / 终裁事实"),
    ("outbox", "登记后续副作用和顺序"),
    ("projection", "更新只读投影"),
    ("complete", "收据完成，可幂等重放"),
]
for i, (name, detail) in enumerate(stages):
    x = 39 + i * 155
    rounded_box(x, 317, 132, 105, fill=WHITE, stroke=GREEN if i in (1,4) else BLUE)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 9.5)
    c.drawCentredString(x + 66, 389, name)
    draw_wrapped(detail, x + 12, 363, 108, size=8, leading=11, color=MUTED, max_lines=4)
    if i < len(stages) - 1:
        arrow(x + 133, 369, x + 153, 369, color=BLUE, width=1.3)
rounded_box(62, 101, 718, 155, fill=WHITE)
draw_bullets([
    "同一 requestId + 同一载荷：继续未完成阶段，不重复权威后果。",
    "同一 requestId + 不同载荷：冲突并失败关闭；重启后仍能复算。",
    "当前覆盖作品送审、教师终裁、第二场创建；不是数据库级分布式事务。",
    "管理员页面显示真实阶段、尝试次数、Outbox 和恢复动作；普通角色只看业务结果。",
], 86, 225, 650, size=10.1, gap=5)

begin_page("结构化模型网关与确定性降级", "架构图 8 · Live 改变合法候选选择，不改变权威边界")
model_flow = [
    ("脱敏输入", "公开事实 / 合法候选 / 预算"),
    ("Provider", "DeepSeek / 星辰 / deterministic"),
    ("Strict Schema", "未知字段 / 越界引用拒绝"),
    ("Policy", "权限 / 风险 / hash / cost"),
    ("Candidate", "proposal_only"),
]
for i, (name, detail) in enumerate(model_flow):
    x = 52 + i * 151
    rounded_box(x, 335, 125, 104, fill=WHITE, stroke=CYAN if i < 2 else GOLD)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 10)
    c.drawCentredString(x + 62.5, 405, name)
    draw_wrapped(detail, x + 12, 378, 101, size=8.2, leading=11.5, color=MUTED, max_lines=4)
    if i < len(model_flow) - 1:
        arrow(x + 126, 387, x + 149, 387, color=BLUE, width=1.3)
card_title_body(55, 116, 346, 150, "健康 Live", "真实模型只能在服务端签发的合法 ruleRef / evidenceRef / knowledgeRef 范围内选择。Prompt、思维链和媒体 Base64 不进入普通角色 DTO。", accent=GREEN)
card_title_body(440, 116, 346, 150, "异常或无凭证", "显式标记 deterministic / degraded；超时、超预算、额外字段或候选外引用不能“猜一个答案”，更不能落权威世界。", accent=RED)

begin_page("完整三角色黄金链", "架构图 9 · 学生行动、教师决策与管理员审计同源")
lanes = [("学生", 408, CYAN), ("教师", 278, GOLD), ("管理员/内核", 148, GREEN)]
for label, y, accent in lanes:
    c.setFillColor(accent)
    c.roundRect(30, y, 86, 72, 10, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 11)
    c.drawCentredString(73, y + 32, label)
    c.setStrokeColor(LINE)
    c.line(126, y + 36, 804, y + 36)
steps = [
    ("认领", 155, 408, CYAN), ("自由行动", 245, 408, CYAN), ("处理建议", 355, 408, CYAN),
    ("作品提交", 500, 408, CYAN), ("查看终评", 650, 408, CYAN), ("第二场行动", 742, 408, CYAN),
    ("风险门", 335, 278, GOLD), ("发布门", 545, 278, GOLD), ("六维终裁", 660, 278, GOLD), ("授权第二场", 760, 278, GOLD),
    ("创建会话", 155, 148, GREEN), ("事件波", 265, 148, GREEN), ("必要 Agent", 385, 148, GREEN),
    ("权威写回", 470, 148, GREEN), ("证据与收据", 570, 148, GREEN), ("LearnerTwin", 680, 148, GREEN),
]
for text_value, x, y, accent in steps:
    c.setFillColor(WHITE)
    c.setStrokeColor(accent)
    c.roundRect(x - 34, y + 17, 68, 38, 7, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("CN-Bold", 7.8)
    c.drawCentredString(x, y + 32, text_value)
for sx, sy, tx, ty in [(155,425,155,202),(265,202,245,425),(355,425,335,315),(335,295,470,202),(500,425,545,315),(545,295,570,202),(570,202,660,315),(660,295,680,202),(680,202,650,425),(650,425,760,315),(760,295,742,425)]:
    arrow(sx, sy, tx, ty, color=MUTED, width=1.0)

begin_page("证据评价：先证据、后挑战、再终裁", "架构图 10 · 分数不能由页面进度或模型偏好生成")
assess = [
    ("真实行为", "动作 / 世界后果 / 纠错"),
    ("真实作品", "七项成果 / 图音视频 / 版本"),
    ("证据门", "充分性 / 权利 / 标识 / 主张"),
    ("盲化六维建议", "去身份，不读教师目标分"),
    ("挑战上限", "3-7 级后置应用"),
    ("教师终裁", "同源证据 + 可解释修订"),
]
for i, (name, detail) in enumerate(assess):
    x = 32 + i * 132
    rounded_box(x, 320, 112, 115, fill=WHITE, stroke=CYAN if i < 3 else GOLD)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 9.2)
    c.drawCentredString(x + 56, 397, name)
    draw_wrapped(detail, x + 11, 368, 90, size=7.8, leading=11, color=MUTED, max_lines=4)
    if i < len(assess) - 1:
        arrow(x + 113, 377, x + 131, 377, color=BLUE, width=1.2)
card_title_body(68, 119, 310, 135, "严格失败关闭", "任一必需维度缺证据时明确“不出分”；建议采纳、页面停留、字数和表面完成率不直接加分。", accent=RED)
card_title_body(462, 119, 310, 135, "本次演示收据", "85/100；8 次修订、8 条主张-证据、20 次行动、11 个世界后果、3 对纠错版本。", accent=GREEN)

begin_page("学习者数字分身与跨场成长", "架构图 11 · 模拟能力状态，不复制人格，不代替学生")
loop_nodes = [
    ("首场真实证据", 60, 338, CYAN),
    ("六维终裁", 240, 338, GOLD),
    ("能力状态 + 不确定性", 420, 338, BLUE),
    ("隔离反事实代理", 600, 338, colors.HexColor("#8661B8")),
    ("3-7 级挑战候选", 600, 168, GREEN),
    ("学生同意 + 教师授权", 365, 168, GOLD),
    ("新 release / session", 130, 168, CYAN),
]
for title, x, y, accent in loop_nodes:
    rounded_box(x, y, 165, 68, fill=WHITE, stroke=accent)
    c.setFillColor(INK)
    c.setFont("CN-Bold", 9.5)
    c.drawCentredString(x + 82.5, y + 37, title)
for sx, sy, tx, ty in [(225,372,240,372),(405,372,420,372),(585,372,600,372),(682,338,682,236),(600,202,530,202),(365,202,295,202),(130,202,90,202)]:
    arrow(sx, sy, tx, ty, color=MUTED, width=1.3)
arrow(130, 168, 60, 338, color=MUTED, width=1.3)
rounded_box(272, 83, 298, 54, fill=RED_LIGHT, stroke=RED)
draw_wrapped("第二场真实行动只校准预测，不反向修改首场终裁，也不能由代理代答。", 292, 116, 258, font="CN-Bold", size=9.5, color=RED)

begin_page("四门课程与内容结构", "内容架构 · 先做深一门旗舰，再验证跨课程可迁移")
course_rows = [
    ("泉州蟳埔簪花围非遗专题采编", "7 节", "旗舰世界：采访、核验、治理、发布、复盘", "完整运行"),
    ("贵州村超多平台视听报道", "6 节", "多平台脚本、直播快讯、版本适配和数据复盘", "迁移课程"),
    ("AI 文旅视觉版权与内容治理", "6 节", "来源、生成判断、版权、标识、投诉与更正", "迁移课程"),
    ("景区暴雨闭园与复开应急报道", "6 节", "预警、快讯、疏导、核查、复开与连续更新", "迁移课程"),
]
rounded_box(42, 129, 758, 333, fill=WHITE)
headers = ["课程", "小节", "岗位任务", "当前定位"]
xs = [60, 360, 430, 690]
for text_value, x in zip(headers, xs):
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 9.5)
    c.drawString(x, 431, text_value)
for i, row in enumerate(course_rows):
    y = 377 - i * 68
    c.setStrokeColor(LINE)
    c.line(58, y - 13, 784, y - 13)
    c.setFillColor(INK)
    c.setFont("CN-Bold", 9.4)
    c.drawString(xs[0], y + 15, row[0])
    c.setFont("CN", 9)
    c.drawString(xs[1], y + 15, row[1])
    draw_wrapped(row[2], xs[2], y + 19, 235, size=8.3, leading=11)
    pill(row[3], xs[3], y + 6, fill=GREEN_LIGHT if i == 0 else CYAN_LIGHT, color=GREEN if i == 0 else BLUE, size=7.5)
draw_wrapped("合计 25 个小节、60 条知识记录。公开资料仅保存元数据、链接、必要短摘录和改写教学材料；旗舰 36 条专业复核项仍诚实标记待审。", 60, 92, 720, font="CN-Bold", size=10, color=BLUE)

begin_page("旗舰五幕 55 分钟连续世界", "内容架构 · 步骤不是前端向导，而是事件、人物与证据的运行合同")
acts = [
    ("0-8", "接单与进入", "确认岗位、现场限制和首轮行动"),
    ("8-20", "采访信任", "门卫 / 传承人，多轮追问与承诺"),
    ("20-34", "冲突核验", "来源比较、商业交换、补证或拒绝"),
    ("34-48", "生产与教师门", "七项作品、三端媒体、发布风险"),
    ("48-55", "后果与迁移", "发布回应、六维终裁、下一场"),
]
for i, (time_range, name, detail) in enumerate(acts):
    x = 32 + i * 157
    c.setFillColor(CYAN if i < 3 else GOLD)
    c.circle(x + 64, 397, 30, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 10)
    c.drawCentredString(x + 64, 394, time_range)
    rounded_box(x, 180, 128, 180, fill=WHITE, stroke=CYAN if i < 3 else GOLD)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 11)
    c.drawCentredString(x + 64, 325, name)
    draw_wrapped(detail, x + 14, 292, 100, size=8.8, leading=13, color=MUTED)
    if i < len(acts) - 1:
        arrow(x + 129, 270, x + 156, 270, color=MUTED, width=1.2)
rounded_box(118, 93, 606, 54, fill=NAVY, stroke=NAVY)
draw_wrapped("幕内行动顺序仍由学生自由选择；人物拒绝、恢复、事件波和教师门读取当前世界状态，不按“点完步骤条”推进。", 142, 126, 558, font="CN-Bold", size=9.5, color=WHITE)

begin_page("知识、来源与内容治理", "内容架构 · 资料为决策服务，不为搜集而搜集")
card_title_body(42, 303, 365, 170, "60 条知识记录", "每条具有 source URL、版本、locator、适用范围、状态与内容 hash；引用漂移、悬空引用或重复 ID 在启动前失败。", accent=CYAN)
card_title_body(435, 303, 365, 170, "36 条旗舰外审问题", "按教学用途、争议风险、鲜度和复核角色逐条登记；外部教师未签字前保持 pending_expert_review。", accent=GOLD)
card_title_body(42, 105, 365, 170, "公开资料边界", "仓库保存元数据、链接、必要短摘录和改写材料；没有明确授权的图片、音频和视频不直接复制。", accent=GREEN)
card_title_body(435, 105, 365, 170, "内容即运行合同", "地点、NPC、对象、媒体、动作、事件、成果、量规与教师门必须由编译器交叉校验，页面不能自行补故事。", accent=RED)

begin_page("公共契约与角色安全", "接口架构 · strict Schema 同时约束服务端出口与前端入口")
contracts = [
    ("CourseRelease / Enrollment", "不可变课程版本、来源、章节、认领与记者主岗"),
    ("LearningActivity", "empty / ready / active / awaiting_review / completed 互斥"),
    ("CollaborationEpisode", "事件、受影响集合、选择/跳过、学生决定、教师门"),
    ("SessionExperienceDescriptor/4", "唯一代际、课程/情境 hash、入口与能力"),
    ("BusinessOperationReceipt/4", "跨 Store 阶段、Outbox、尝试与恢复"),
    ("DialogueEpisode/4", "人物议题、事实、关系、承诺、时间和请求收据"),
]
for i, (name, detail) in enumerate(contracts):
    col, row = i % 2, i // 2
    card_title_body(42 + col * 392, 360 - row * 130, 365, 105, name, detail, accent=CYAN if col == 0 else GOLD, body_size=8.8)
draw_wrapped("学生 / 教师响应排除 Prompt、私有记忆、原始 Trace、Token、供应方密钥、媒体 Base64 和无权角色信息；普通学生直接访问管理员路由时先拒绝角色错配。", 60, 72, 720, font="CN-Bold", size=9.6, color=RED)

# ---------------------------------------------------------------------------
# 真实浏览器证据：48 个节点
# ---------------------------------------------------------------------------

EVIDENCE = [
    dict(id=1, file="01-学生未认领课程空态.png", title="未认领课程时只有真实空态", stage="课程入口", status="失败关闭", pill_fill=RED_LIGHT, pill_color=RED, action="学生首次打开“我的课程”。", system="只读取本人 CourseEnrollment；没有 session 时不探测世界投影。", result="页面只给“浏览课程大厅”一个下一步，不堆课程模板。", proof="未认领 ≠ 暂无任务却显示运行内容。", focus=0.0),
    dict(id=2, file="02-课程大厅与旗舰课程认领.png", title="课程大厅展示四门真实课程", stage="课程入口", status="可认领", action="学生浏览课程大厅并定位泉州旗舰课。", system="课程目录来自不可变 CourseRelease，而非浏览器静态卡片。", result="四门课程均有明确岗位任务；旗舰课提供认领入口。", proof="认领前不创建会话，也不渲染训练状态。", focus=0.0),
    dict(id=3, file="03-旗舰课程详情与记者主岗位.png", title="课程详情冻结记者主岗位与七个小节", stage="课程入口", status="版本化内容", action="学生查看课程详情、来源和学习成果。", system="服务端返回课程 release、章节、公开来源、主岗位和内容 hash。", result="普通学生固定承担 reporter，其他岗位由 NPC/受控智能体协作。", proof="7 小节、24 个来源的课程说明可见；运行中不可静默改版。", focus=0.08),
    dict(id=4, file="04-课程认领成功与进入实训.png", title="认领后创建真实训练会话", stage="课程入口", status="服务端落账", action="点击认领并进入当前实训。", system="创建 enrollment、membership、RoleBinding、session 与体验描述符。", result="学生进入泉州持续世界；课程与 session 绑定不可变。", proof="错 binding、错 session 或 hash 漂移均不能进入。", focus=0.0),
    dict(id=5, file="05-行动前证据不足严格不出分.png", title="没有真实证据就不评分", stage="证据评价", status="零分数输出", pill_fill=RED_LIGHT, pill_color=RED, action="学生在行动前查看评价入口。", system="Evidence Gate 检查行动、后果、作品、版本和主张证据。", result="明确提示证据不足，不产生总分或学习者模型。", proof="页面完成率和静态字段不能替代真实能力证据。", focus=0.0),
    dict(id=6, file="06-自由语义行动与当前唯一AI建议.png", title="自由语义行动进入受约束候选链", stage="现场行动", status="一个当前建议", action="学生用自己的话向责任编辑说明下一步。", system="语义端口脱敏理解，服务端策略编译合法动作并触发事件波。", result="学生只看到一个当前最相关建议和一个主行动。", proof="模型不直接写世界；越界输出降级为确定性候选。", focus=0.0),
    dict(id=7, file="07-学生侧风险教师门等待态.png", title="风险出现后学生端冻结主行动", stage="教师门", status="等待教师", pill_fill=GOLD_LIGHT, pill_color=colors.HexColor("#9A6812"), action="学生推进门卫/采访对象交互并触发风险条件。", system="WorldEngine 识别教师门；学生投影裁剪内部调度与 Trace。", result="主行动变为等待教师，不能绕过门继续制造后果。", proof="教师门是服务端状态，不是前端弹窗。", focus=0.0),
    dict(id=8, file="08-教师导演台业务因果与风险门.png", title="教师看到完整业务因果而非后台噪声", stage="教师门", status="2 / 14 参与", action="教师打开当前会话的导演台。", system="同一 Episode 投影为事件、受影响集合、选择/跳过、学生决定和风险门。", result="本轮只选择 2/14 必要智能体，其余节点保留业务跳过理由。", proof="教师不见 Prompt/供应方；管理员才看技术 Trace。", focus=0.0),
    dict(id=9, file="09-教师门批准与权威后果写回.png", title="教师批准后由 WorldEngine 正式写回", stage="教师门", status="stateVersion +1", action="教师批准现场风险门。", system="教师命令经身份、版本、引用和风险策略校验后交给 WorldEngine。", result="世界后果与证据一次性追加，学生现场同步刷新。", proof="教师门有终裁权，但不直接编辑历史事件。", focus=0.0),
    dict(id=10, file="10-知识接地与信源核验协作建议.png", title="来源比较触发知识接地协作", stage="知识接地", status="有据建议", action="学生比较报道所需的来源包。", system="Grounded Episode 依次绑定 Claim、知识、证据、智能体贡献和修订建议。", result="建议携带有限来源与可执行核验动作。", proof="无合法 locator 或 hash 对不上时不会输出接地建议。", focus=0.0),
    dict(id=11, file="11-智能体协作贡献与知识依据展开.png", title="学生可以追问建议依据", stage="知识接地", status="来源可追溯", action="展开当前建议的协作贡献与知识依据。", system="Contribution 只汇总真实 Task/Run 与合法公开来源，不转抄私有 trace。", result="显示可核验 URL、locator、主张和采用边界。", proof="学生看“为什么”，仍不暴露 Prompt、成本或私有记忆。", focus=0.25),
    dict(id=12, file="12-商业素材交换灰度冲突.png", title="岗位冲突没有唯一正确按钮", stage="灰度冲突", status="多解决策", action="学生面对商户提出的商业素材交换。", system="规则读取权利、编辑独立、承诺与机会成本，不按选项编号给分。", result="学生可采纳、补证或拒绝；每条路线要求不同证据。", proof="世界模型允许探索，并保留可恢复分支。", focus=0.0),
    dict(id=13, file="13-要求补证后的恢复性任务.png", title="拒绝捷径后仍可恢复推进", stage="灰度冲突", status="恢复任务", action="学生选择要求补证而非立即入库。", system="人物 Episode 更新承诺和关系，WorldEngine 生成新的可执行任务。", result="流程转入补证，不因一次非最优行动而死锁。", proof="恢复与反思本身进入后续能力证据。", focus=0.0),
    dict(id=14, file="14-三端融媒体素材处理台.png", title="图片、音频、视频进入同一素材工作台", stage="作品生产", status="三端媒体", action="学生打开媒体工作台处理采访素材。", system="三种媒体共享 provenance、usage、rights、transform 和 version 合同。", result="学生可生成派生物、补充授权并组成送审包。", proof="没有明确权利与来源时不能进入质量观察。", focus=0.08),
    dict(id=15, file="15-媒体真实派生版本与哈希收据.png", title="真实派生文件产生不可变收据", stage="作品生产", status="双 hash", action="学生对图像执行裁切派生。", system="后端实际处理文件，记录父版本、字节、MIME、SHA-256、变换与权利。", result="新派生物与原始素材形成可追溯版本链。", proof="不是只修改文件名或在前端伪造“已处理”。", focus=0.25),
    dict(id=16, file="16-三端媒体包锁定送审.png", title="媒体包锁定后不可静默覆盖", stage="作品生产", status="已锁定", action="学生锁定图片、音频、视频送审包。", system="服务端复核来源、用途、授权、标识和内容 hash，再生成送审引用。", result="评价端只消费锁定且哈希绑定的媒体表示。", proof="撤权、缺件或 hash 漂移会失败关闭。", focus=0.55),
    dict(id=17, file="17-学生编辑部七项成果工作台.png", title="七项成果在独立编辑部完成", stage="作品生产", status="岗位工作台", action="学生打开编辑部工作台。", system="Work Composition Root 管理版本、父引用、证据绑定、锁定和提交。", result="主题、信源、采访、核查、专题稿、发布更正、迁移复盘各自可修订。", proof="作品工作与现场行动分离，但共享同一 session 证据链。", focus=0.0),
    dict(id=18, file="18-四项作品锁定与证据绑定.png", title="前四项成果锁定并绑定证据", stage="作品生产", status="4 项完成", action="学生提交并锁定主题、信源、采访、核查成果。", system="每项版本都带内容 hash、父版本和 evidenceRef。", result="成果进入送审集合，不能以后用无痕覆盖替换。", proof="评价读取真实版本链，不只读取最终文本。", focus=0.0),
    dict(id=19, file="19-专题稿R1与内容哈希.png", title="专题稿 R1 真实触发最低长度门", stage="迭代写作", status="保留失败版本", pill_fill=RED_LIGHT, pill_color=RED, action="学生保存第一版专题稿。", system="服务端验证正文长度、结构和引用；不满足门槛仍保留 R1 与 hash。", result="R1 未被伪装成合格终稿，学生需要继续修订。", proof="失败本身成为可审计的学习过程。", focus=0.0),
    dict(id=20, file="20-编辑部审阅专题稿与修订建议.png", title="责任编辑智能体只给修订建议", stage="迭代写作", status="proposal_only", action="学生把扩充后的专题稿提交编辑审阅。", system="编辑智能体基于冻结规则和证据提出有限修改建议。", result="学生决定是否采纳；智能体不能替学生锁定或发布。", proof="建议影响过程，但不直接产生分数。", focus=0.0),
    dict(id=21, file="21-专题稿终稿锁定与父版本链.png", title="R1-R2-R3 父版本链完整保留", stage="迭代写作", status="终稿锁定", action="学生采纳有据建议、完成第三版并锁定。", system="服务端验证父版本、内容 hash、证据引用与锁定状态。", result="最终稿与前两版、学生选择和建议来源全部可追溯。", proof="最终成绩可区分一次最优与反思改进。", focus=0.0),
    dict(id=22, file="22-七项必交成果全部锁定.png", title="七项必交成果全部完成", stage="作品生产", status="7 / 7", action="学生完成发布更正方案和迁移复盘。", system="作品组合根汇总七项锁定版本与证据，不读取表面完成率替代内容。", result="发布门正式开放；缺任一必交时命令被拒绝。", proof="完整成果包成为教师终审与评价输入。", focus=0.0),
    dict(id=23, file="23-发布门前专业建议.png", title="发布前只呈现一条当前治理建议", stage="发布门", status="必要协作", action="学生进入发布门并检查专业建议。", system="版权、内容安全、平台规则与运营按受影响集合选择必要节点。", result="学生处理一条最相关建议，然后提交教师终审。", proof="复杂 Agent 协作被压缩为岗位可执行语言。", focus=0.0),
    dict(id=24, file="24-教师发布风险终审.png", title="教师终审七项作品与发布风险", stage="发布门", status="3 / 14 参与", action="教师审查发布包、学生决定和风险项。", system="教师投影读取同一 Episode、7/7 作品与三节点贡献，不显示私有技术字段。", result="可批准、要求补证或拒绝；每项选择绑定理由。", proof="教师决策不是页面开关，而是权威门命令。", focus=0.0),
    dict(id=25, file="25-发布教师门批准与最终写回.png", title="发布批准产生最终世界后果", stage="发布门", status="正式结算", action="教师批准发布。", system="命令经版本、作品、证据和风险校验，WorldEngine 追加发布后果。", result="作品状态、世界变量和发布回应弧同步推进。", proof="同一请求重放不会重复制造发布后果。", focus=0.0),
    dict(id=26, file="26-可信发布终局与评价入口.png", title="可信发布不是世界的终点", stage="世界终局", status="可评价", action="学生查看发布终局并进入复盘。", system="世界根据事实、权利、治理和回应状态选择四种权威结局之一。", result="本次链路进入可信发布，并开放证据评价。", proof="发布后回应和更正债仍由世界状态驱动。", focus=0.0),
    dict(id=27, file="27-学生六维评价初判与纠错版本对.png", title="六维初判只消费真实证据", stage="评价复盘", status="85 / 100 初判", action="学生打开评价复盘。", system="评价器去身份读取行为、后果、作品、主张证据与修订链，先过充分性门。", result="显示六维建议和 85 分初判，以及 3 对纠错版本。", proof="8 修订、8 主张证据、20 行动、11 后果均来自权威记录。", focus=0.0),
    dict(id=28, file="28-教师逐维证据终裁页.png", title="教师按同源证据逐维复核", stage="教师终裁", status="可修订判断", action="教师打开逐维终裁页。", system="教师看到每维来源、暂定判断、反证和证据不足原因。", result="可确认或有理由调整建议，但不能改原始行为/作品。", proof="学生与教师使用同一证据底座，不存在两套分数事实。", focus=0.0),
    dict(id=29, file="29-教师终裁固定与成长机制审核.png", title="终裁固定后才能生成成长候选", stage="教师终裁", status="85 分固定", action="教师提交终裁并查看成长机制。", system="业务收据先固定终裁，再通过 Outbox 生成学习者状态候选。", result="终裁与成长方案有明确顺序，不会半状态。", proof="重启可续建未完成后续步骤，不重复终裁。", focus=0.32),
    dict(id=30, file="30-学生终裁结果与学习者数字分身.png", title="学生看到可申诉的能力状态", stage="个性化成长", status="挑战 4 → 5", action="学生查看终裁、能力状态和下一轮建议。", system="LearnerTwin 只由证据充分的终裁生成，保留支持、反证和不确定性。", result="提出五项机制变化与挑战 5 候选，并提供申诉入口。", proof="产品术语是证据约束数字分身，不是敏感人格复制。", focus=0.18),
    dict(id=31, file="31-学生同意第二场等待教师授权.png", title="学生单方同意不能创建第二场", stage="个性化成长", status="等待双同意", action="学生同意接受个性化第二场。", system="系统只记录学生 consent；第二场仍缺教师 authorization。", result="页面进入等待教师状态，不提前创建 session。", proof="学习者代理不能替学生同意，也不能绕过教师。", focus=0.0),
    dict(id=32, file="32-教师第二场授权前机制审核.png", title="教师审核挑战等级与机制变化", stage="个性化成长", status="教师审核", action="教师查看证据、五项机制变化和挑战 4→5 建议。", system="ChallengePolicy 只给候选；教师可接受或有理由覆盖 3-7 级。", result="授权前明确下一场会改变什么，而非只换难度标签。", proof="教师不能反改首场终裁，也不能代学生执行下一场。", focus=0.27),
    dict(id=33, file="33-真实第二场创建成功.png", title="双同意后创建新的权威世界", stage="个性化成长", status="新 session", action="教师批准第二场。", system="跨 Store 编排创建新 release、membership、binding、session 和体验描述符。", result="页面返回真实第二场入口；首场保持不可变历史。", proof="BusinessOperationReceipt 保证中断后续建且不重复创建。", focus=0.3),
    dict(id=34, file="34-压力五级自适应第二场.png", title="第二场以压力五级和新机制运行", stage="第二场", status="active", action="学生进入新会话。", system="新体验描述符冻结挑战 5 与机制变化，世界状态独立。", result="任务、压力和约束真实变化，不是旧页面替换文案。", proof="新 sessionId 与首场证据隔离。", focus=0.0),
    dict(id=35, file="35-第二场真实学生行动.png", title="学生在第二场产生新的真实行动", stage="第二场", status="新证据", action="学生在挑战 5 世界执行自由行动。", system="语义编译、事件波和世界结算全部写入第二场 session。", result="新行为成为预测校准证据，不回填首场作品。", proof="学习者代理没有代答；页面记录的是学生自己的行动。", focus=0.0),
    dict(id=36, file="36-第二场真实行动校准学习者模型.png", title="跨场行动只校准预测，不反改旧分", stage="个性化成长", status="1 次校准", action="返回首场复盘查看学习者模型变化。", system="Calibration 读取第二场真实行动与先前预测，更新置信度和误差。", result="显示已用 1 个真实行动校准；首场 85 分不变。", proof="预测校准和评分权威被严格分离。", focus=0.2),
    dict(id=37, file="37-管理员管理总览.png", title="管理员总览只显示真实当前状态", stage="管理员审计", status="operator only", action="管理员进入系统总览。", system="Operations Root 汇总会话、模式、健康、教师门和业务收据。", result="当前无运行任务时显示 0，不伪造繁忙日志填充页面。", proof="管理员身份独立于世界 ActorKind。", focus=0.0),
    dict(id=38, file="38-管理员智能体全景.png", title="六组十四拓扑由运行清单动态渲染", stage="管理员审计", status="14 节点", action="管理员打开智能体全景。", system="读取 AgentTopologyManifest、节点权限、订阅、模式和本轮状态。", result="六组十四节点、连接和运行状态可追踪。", proof="节点状态来自 DispatchPlan / Run，不由浏览器猜测。", focus=0.08),
    dict(id=39, file="39-管理员事件日志.png", title="世界事件日志按版本追溯", stage="管理员审计", status="权威事件", action="管理员查看事件日志。", system="读取 WorldEvent、来源命令、actor、stateVersion 与关联证据。", result="可以沿事件链还原现场、教师门和发布后果。", proof="页面文案和模型文本不是世界事实源。", focus=0.12),
    dict(id=40, file="40-管理员运行追踪.png", title="管理员独占完整 Task/Run/Intent 追踪", stage="管理员审计", status="技术 Trace", action="管理员查看运行追踪。", system="汇总 Task、Run、Observation、Intent、Provider、降级、成本、延迟和恢复。", result="可区分 selected、skipped、failed 与 deterministic。", proof="长页原图完整保存在截图目录；手册同时给出重点裁切与全页缩略。", focus=0.32),
    dict(id=41, file="41-管理员系统证据与学习者审计.png", title="系统证据与学习者链同屏可审计", stage="管理员审计", status="证据 + 收据", action="管理员打开系统证据页。", system="关联作品、权威事件、业务收据、Outbox、终裁、LearnerTwin 和 calibration。", result="可验证首场终裁、第二场创建与校准的顺序。", proof="普通学生和教师网关没有读取这些技术字段的能力。", focus=0.18),
    dict(id=42, file="42-管理员质量与参赛证据.png", title="质量页保留失败和证据不足", stage="管理员审计", status="诚实质量门", action="管理员查看参赛质量证据。", system="读取自动化门、版本、密钥扫描、E2E 和 A/B/C 实际观察。", result="没有实际消融观察时明确 insufficient_evidence。", proof="不能用框架存在或空样本宣称多智能体优越。", focus=0.15),
    dict(id=43, file="43-学生已认领课程与进度入口.png", title="学生可以从课程页返回训练", stage="辅助页面", status="已认领", action="学生返回“我的课程”。", system="读取 enrollment 并提供当前训练入口。", result="课程已认领可继续进入；当前进度摘要仍显示旧聚合值。", proof="该摘要未完全消费 V4 成果，已列为整合缺口。", focus=0.0),
    dict(id=44, file="44-学生作品与证据汇总.png", title="作品汇总暴露当前聚合缺口", stage="辅助页面", status="已知缺口", pill_fill=RED_LIGHT, pill_color=RED, action="学生打开作品与证据汇总。", system="该旧聚合页尚未汇入 V4 编辑部 7 项锁定成果。", result="页面显示空态，与 V4 工作台/评价/管理员证据的权威结果不一致。", proof="手册保留真实截图，不编辑数据库伪造“已汇总”。", focus=0.0),
    dict(id=45, file="45-教师课程与班级入口.png", title="教师入口聚焦班级与教学决策", stage="辅助页面", status="teacher only", action="教师查看课程与班级入口。", system="只读取教师授权的班级、课程和会话摘要。", result="可进入导演台和评价，不展示管理员技术日志。", proof="角色页面和数据投影同时隔离。", focus=0.08),
    dict(id=46, file="46-教师课程设计与内容版本.png", title="教师查看不可变课程设计与来源", stage="辅助页面", status="版本可追溯", action="教师查看课程章节、来源和发布版本。", system="课程内容来自已编译 release；运行 session 绑定具体 hash。", result="教师能理解课程逻辑，但不能在运行中静默改写事实。", proof="新版本必须形成新 release，而不是覆盖旧场。", focus=0.0),
    dict(id=47, file="47-普通学生访问管理员页面被拒绝.png", title="普通学生无法读取管理员页面", stage="权限边界", status="拒绝访问", pill_fill=RED_LIGHT, pill_color=RED, action="学生直接访问管理员 URL。", system="前端路由和服务端 operator 授权共同校验角色。", result="明确显示身份与页面不匹配，不读取管理员业务数据。", proof="隐藏菜单不是权限控制；服务端仍必须拒绝。", focus=0.0),
    dict(id=48, file="48-390x844学生评价复盘.png", title="390×844 移动端评价无横向溢出", stage="响应式", status="375 = 375", action="在 390×844 视口打开学生评价复盘。", system="角色页面使用响应式布局，长证据卡纵向展开。", result="实测 clientWidth=375、scrollWidth=375。", proof="移动端不靠缩放整页或隐藏核心评价信息。", focus=0.0),
]

for evidence in EVIDENCE:
    evidence_page(evidence)

# ---------------------------------------------------------------------------
# 收口、验证与附录
# ---------------------------------------------------------------------------

begin_page("工程验证基线", "质量门 · 证明软件一致性，不越界证明教学效果")
metrics = [
    ("13", "工作区类型检查", CYAN),
    ("1281", "非 Live 自动化通过", GREEN),
    ("7", "仅外部 Live 用例跳过", GOLD),
    ("13 / 13", "fresh Chromium 黄金链", BLUE),
    ("1440×900", "桌面关键页", colors.HexColor("#8661B8")),
    ("390×844", "移动关键页", RED),
]
for i, (value, label, accent) in enumerate(metrics):
    col, row = i % 3, i // 3
    x, y = 50 + col * 255, 322 - row * 175
    rounded_box(x, y, 225, 140, fill=WHITE, stroke=accent)
    c.setFillColor(accent)
    c.setFont("CN-Bold", 23)
    c.drawCentredString(x + 112.5, y + 85, value)
    c.setFillColor(MUTED)
    c.setFont("CN-Bold", 9.5)
    c.drawCentredString(x + 112.5, y + 45, label)
draw_wrapped("范围：课程空态/认领、自由行动、三段人物、多智能体协作、两次教师门、三端媒体、七项作品、六维终裁、第二场校准、角色越权与管理员消融诚实门。", 82, 84, 680, font="CN-Bold", size=9.4, color=BLUE)

begin_page("已知缺口与不可宣称事项", "诚实边界 · 这些问题不能被长篇 PDF 掩盖")
gaps = [
    ("P0 聚合缺口", "课程进度和作品汇总旧投影尚未完全消费 V4 编辑部证据；当前以工作台、评价页和管理员证据页为权威。"),
    ("人物覆盖", "10 名 NPC 均有主动计划，但只有门卫、传承人、商户三名具备完整受约束多轮 Episode。"),
    ("媒体理解", "图像预览、音频频谱、视频关键帧已接通；没有 ASR，也没有连续视频语义理解。"),
    ("专业外审", "36 条旗舰知识仍待专业教师复核；不能写“专业有效”或伪造签字。"),
    ("真实 Live", "受控 DeepSeek 合同已冒烟；本截图使用 deterministic；星辰尚无发布实例和真实收据。"),
    ("消融与效果", "框架已记录成本、延迟、无关调用、越权和证据覆盖；真实观察为 0 时不能宣称优势。"),
]
for i, (title, body) in enumerate(gaps):
    col, row = i % 2, i // 2
    card_title_body(42 + col * 392, 385 - row * 145, 365, 118, title, body, accent=RED if i == 0 else GOLD, body_size=8.8)

begin_page("启动与复现实验", "运行说明 · 一个入口，三类角色，隔离数据可重建")
rounded_box(42, 300, 758, 165, fill=NAVY, stroke=NAVY)
c.setFillColor(CYAN)
c.setFont("CN-Bold", 11)
c.drawString(64, 430, "Windows 双击")
c.setFillColor(WHITE)
c.setFont("CN-Bold", 17)
c.drawString(64, 397, "启动融岗智训.cmd")
c.setFont("CN", 10)
c.drawString(64, 365, "默认 API: http://127.0.0.1:3001   Web: http://127.0.0.1:4173")
c.drawString(64, 340, "终端命令: corepack pnpm start:fresh")
routes = [
    ("学生空态", "/student/courses?profileId=student-unassigned"),
    ("教师班级", "/teacher/classes?profileId=teacher-class-a"),
    ("管理员总览", "/admin/overview?profileId=operator-main"),
]
for i, (label, route) in enumerate(routes):
    card_title_body(42 + i * 260, 130, 238, 135, label, route, accent=CYAN if i == 0 else GOLD if i == 1 else GREEN, body_size=8.2)
draw_wrapped("演示数据位于被 Git 忽略的 DATA_DIR；要获得干净链路，应使用 fresh / 隔离目录，而不是复用未知旧服务。模型无凭证时必须显示 deterministic。", 63, 92, 716, font="CN-Bold", size=9.3, color=BLUE)

begin_page("V2.4 版本演进", "版本历史 · 已发生事实只写入 03-开发历史")
versions = [
    ("V2.4.0", "PM-011", "重置旗舰世界工程化深化周期"),
    ("V2.4.1", "ARCH-012", "会话体验描述与六个组合根"),
    ("V2.4.2", "DATA-003", "跨存储业务收据与恢复"),
    ("V2.4.3", "GAME-006", "三段九结局受约束多轮人物"),
    ("V2.4.4", "AI-022", "统一候选模型与多模态质量端口"),
    ("V2.4.5", "CONTENT-011", "五幕旗舰内容、灰度冲突与迁移样本"),
    ("V2.4.6", "FE-014", "三角色渐进披露与岗位任务聚焦"),
    ("V2.4.7", "QA-012", "1281 测试与 fresh E2E 质量冻结"),
    ("V2.4.8", "OPS-001", "根目录、资产和决策资料治理"),
    ("V2.4.9", "DOC-011", "最新架构与全功能交互演示手册"),
]
for i, (version, task, desc) in enumerate(versions):
    col, row = i % 2, i // 2
    x, y = 42 + col * 392, 443 - row * 77
    c.setFillColor(CYAN if i < 7 else GOLD if i < 9 else GREEN)
    c.circle(x + 14, y, 8, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 9.7)
    c.drawString(x + 32, y + 5, f"{version} / {task}")
    c.setFillColor(MUTED)
    c.setFont("CN", 8.5)
    c.drawString(x + 32, y - 13, desc)
    if row < 4:
        c.setStrokeColor(LINE)
        c.line(x + 14, y - 10, x + 14, y - 69)

begin_page("关键接口与 Schema 版本", "附录 A · 主要公共读取和权威命令入口")
api_rows = [
    ("GET /api/courses", "CourseRelease/2.0.0", "学生/教师", "课程目录"),
    ("POST /api/course-enrollments", "CourseEnrollment/2.0.0", "学生", "认领记者主岗"),
    ("GET .../learning-activity", "LearningActivity/2.0.0", "学生/教师", "互斥活动状态"),
    ("GET .../session-experience", "SessionExperienceDescriptor/4.0.0", "三角色裁剪", "唯一代际入口"),
    ("GET/POST .../flagship-v4", "V4 strict DTO/commands", "学生/教师", "现场、作品、门与评价"),
    ("GET .../business-operations", "BusinessOperationReceipt/4.0.0", "管理员", "收据/Outbox/恢复"),
    ("GET .../topology", "SimulationAgentTopology/3.0.0", "管理员", "六组十四运行全景"),
]
rounded_box(38, 92, 766, 375, fill=WHITE)
headers = ["入口", "契约", "角色", "用途"]
positions = [54, 345, 535, 645]
for label, x in zip(headers, positions):
    c.setFillColor(NAVY)
    c.setFont("CN-Bold", 8.8)
    c.drawString(x, 438, label)
for i, row in enumerate(api_rows):
    y = 397 - i * 45
    c.setStrokeColor(LINE)
    c.line(52, y - 14, 790, y - 14)
    for j, value in enumerate(row):
        c.setFillColor(INK if j == 0 else MUTED)
        c.setFont("CN-Bold" if j == 0 else "CN", 7.8)
        draw_wrapped(value, positions[j], y + 5, [270,170,90,135][j], size=7.8, leading=10, color=INK if j == 0 else MUTED, max_lines=2)

begin_page("关键主张到证据的映射", "附录 B · 评审可从产品主张直接回到页面与工程事实")
claims = [
    ("真实岗位世界", "截图 06-13、26；WorldEvent + stateVersion；五幕内容合同"),
    ("必要子集多智能体", "截图 08、11、24、38-40；DispatchPlan / Task / Run"),
    ("零越权正式写入", "截图 07-09、23-25、47；WorldEngine / TeacherGate"),
    ("真实作品与证据", "截图 14-22、27-29、41；版本、双 hash、权利与证据引用"),
    ("个性化成长闭环", "截图 30-36；LearnerTwin、双同意、第二场与校准"),
    ("工程可复算", "V2.4.7：1281 passed / 7 skipped；fresh Chromium 13/13"),
]
for i, (claim, evidence) in enumerate(claims):
    y = 432 - i * 63
    pill(claim, 48, y - 5, fill=CYAN_LIGHT if i < 3 else GOLD_LIGHT, color=BLUE if i < 3 else colors.HexColor("#9A6812"), size=8.4)
    draw_wrapped(evidence, 218, y + 4, 560, size=9.2, leading=13, color=INK, max_lines=2)
    c.setStrokeColor(LINE)
    c.line(48, y - 24, 790, y - 24)

for index_page in range(2):
    begin_page(f"截图证据索引 {index_page + 1} / 2", "附录 C · 原始 PNG 全部保存在 演示/截图")
    start = index_page * 24
    subset = EVIDENCE[start:start + 24]
    for j, item in enumerate(subset):
        col, row = j % 3, j // 3
        x, y = 32 + col * 266, 442 - row * 50
        c.setFillColor(CYAN if item["id"] <= 36 else GOLD)
        c.circle(x + 10, y, 8, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("CN-Bold", 7.5)
        c.drawCentredString(x + 10, y - 2.5, f"{item['id']:02d}")
        draw_wrapped(item["title"], x + 27, y + 4, 215, size=7.4, leading=9.5, color=INK, max_lines=2)

begin_page("结语：把技术藏在世界背后，把证据留在系统之中", "收口 · 真实体验与可审计工程必须同时成立", dark=False)
rounded_box(52, 180, 738, 270, fill=NAVY, stroke=NAVY)
draw_wrapped(
    "对学生，技术表现为一个会回应、会冲突、会留下后果的真实岗位世界；对教师，技术表现为可干预、可追溯、可终裁的教学因果链；对管理员和评委，技术表现为每个事件、智能体选择、作品版本、证据、模型候选、权威写入和跨场成长都能够复核。",
    84,
    400,
    674,
    font="CN-Bold",
    size=16,
    leading=28,
    color=WHITE,
)
draw_wrapped(
    "当前原型已经具备完整旗舰演示价值，但仍必须正视作品聚合、专业外审、真实 Live、人物覆盖和消融实证等缺口。下一次开发应优先消除这些断点，而不是继续增加页面或后台日志。",
    84,
    275,
    674,
    size=10.5,
    leading=17,
    color=colors.HexColor("#C6DDE8"),
)
pill("世界状态唯一", 146, 118, fill=CYAN_LIGHT, color=BLUE, size=9)
pill("智能体候选受控", 291, 118, fill=CYAN_LIGHT, color=BLUE, size=9)
pill("证据先于分数", 446, 118, fill=GOLD_LIGHT, color=colors.HexColor("#9A6812"), size=9)
pill("成长不替代本人", 583, 118, fill=GREEN_LIGHT, color=GREEN, size=9)

c.save()
print(f"generated={OUT_PATH}")
print(f"pages={page_no}")
print(f"screenshots={len(EVIDENCE)}")
