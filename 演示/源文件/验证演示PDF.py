# -*- coding: utf-8 -*-
"""验证演示 PDF 的结构，并为人工视觉复核生成联系表和封面预览。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
PDF_PATH = ROOT / "演示" / "融岗智训-V2.4.9-全功能架构与交互演示手册.pdf"
SCREEN_DIR = ROOT / "演示" / "截图"
RENDER_DIR = ROOT / "tmp" / "pdfs" / "rendered-v249"
CONTACT_DIR = ROOT / "tmp" / "pdfs" / "contact-v249"
PREVIEW_PATH = ROOT / "演示" / "封面预览.png"

reader = PdfReader(str(PDF_PATH))
assert len(reader.pages) == 77, f"unexpected page count: {len(reader.pages)}"
assert PDF_PATH.stat().st_size > 5_000_000, "PDF is unexpectedly small"

expected_text = [
    "融岗智训",
    "系统分层与依赖方向",
    "六组十四智能体运行拓扑",
    "学习者数字分身与跨场成长",
    "未认领课程时只有真实空态",
    "管理员独占完整 Task/Run/Intent 追踪",
    "已知缺口与不可宣称事项",
    "V2.4 版本演进",
]
all_text = "\n".join(page.extract_text() or "" for page in reader.pages)
for heading in expected_text:
    assert heading in all_text, f"missing expected heading: {heading}"

for index, page in enumerate(reader.pages, start=1):
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    assert width > height, f"page {index} is not landscape"
    text = (page.extract_text() or "").strip()
    assert len(text) >= 20, f"page {index} appears blank"

screenshots = sorted(SCREEN_DIR.glob("*.png"))
assert len(screenshots) == 48, f"unexpected screenshot count: {len(screenshots)}"
rendered = sorted(RENDER_DIR.glob("page-*.png"))
assert len(rendered) == 77, f"unexpected rendered page count: {len(rendered)}"

CONTACT_DIR.mkdir(parents=True, exist_ok=True)
font_path = Path(r"C:\Windows\Fonts\msyh.ttc")
font = ImageFont.truetype(str(font_path), 18, index=0)
thumb_w, thumb_h = 380, 269
label_h = 28
cols, rows = 3, 4

for sheet_index in range((len(rendered) + cols * rows - 1) // (cols * rows)):
    canvas = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "#10283a")
    draw = ImageDraw.Draw(canvas)
    batch = rendered[sheet_index * cols * rows : (sheet_index + 1) * cols * rows]
    for slot, path in enumerate(batch):
        col, row = slot % cols, slot // cols
        x, y = col * thumb_w, row * (thumb_h + label_h)
        with Image.open(path) as image:
            rgb = image.convert("RGB")
            rgb.thumbnail((thumb_w - 8, thumb_h - 8), Image.Resampling.LANCZOS)
            px = x + (thumb_w - rgb.width) // 2
            py = y + 4 + (thumb_h - 8 - rgb.height) // 2
            canvas.paste(rgb, (px, py))
        draw.text((x + 8, y + thumb_h + 2), path.stem.replace("page-", "第 ") + " 页", fill="#d9f7fb", font=font)
    target = CONTACT_DIR / f"contact-{sheet_index + 1:02d}.jpg"
    canvas.save(target, "JPEG", quality=88, optimize=True)

with Image.open(rendered[0]) as cover:
    preview = cover.convert("RGB")
    preview.thumbnail((1600, 1200), Image.Resampling.LANCZOS)
    preview.save(PREVIEW_PATH, "PNG", optimize=True)

print(f"pdf_pages={len(reader.pages)}")
print(f"screenshots={len(screenshots)}")
print(f"rendered_pages={len(rendered)}")
print(f"contact_sheets={len(list(CONTACT_DIR.glob('contact-*.jpg')))}")
print(f"preview={PREVIEW_PATH}")
