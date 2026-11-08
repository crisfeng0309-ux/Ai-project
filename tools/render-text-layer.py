# 用同一份模板坐标在本地排出「文字层」，带自适应缩放（验证用，不进生产）
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(r"C:\Users\ni\Desktop\ds开发\Ai-project")
OUT = Path(r"C:\Users\ni\Desktop\ds开发")
NODE = r"C:\Users\ni\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

script = """
const m = await import('file:///C:/Users/ni/Desktop/ds%E5%BC%80%E5%8F%91/Ai-project/lib/image-recipes.mjs');
const out = {};
for (const key of m.TEMPLATE_KEYS) {
  const spec = m.templateSpec(key);
  out[key] = { name: spec.name, label: spec.label, zones: spec.zones, slots: spec.slots };
}
process.stdout.write(JSON.stringify(out));
"""
tmp = OUT / ".zones.mjs"
tmp.write_text(script, encoding="utf-8")
try:
    raw = subprocess.run([NODE, str(tmp)], capture_output=True, text=True, encoding="utf-8", check=True).stdout
finally:
    tmp.unlink(missing_ok=True)
specs = json.loads(raw)

W = H = 1024
UNIT = W / 1000
LEVELS = {"headline": 100, "sub": 38, "body": 34, "price": 96, "small": 22}
FONT_BOLD = r"C:\Windows\Fonts\LeelaUIb.ttf"
FONT_REG = r"C:\Windows\Fonts\leelawui.ttf"

COPY = {
    "headline": "กันน้ำ กันลม ระบายอากาศ",
    "subline": "DryVent กันน้ำ ระบายอากาศ",
    "callouts": ["กันน้ำ DryVent", "กันลม", "ระบายอากาศ", "กระเป๋าซิป", "พกพาสะดวก", "กันหนาว"],
    "brand": "THE NORTH FACE",
    "price": "฿4,180",
    "statement": "ออกแบบมาเพื่อการเดินทางในทุกสภาพอากาศ",
    "chips": ["เดินป่า", "ตั้งแคมป์", "เดินทาง"],
    "fine": "มีให้เลือกหลายไซซ์",
}


def wrap(draw, text, font, max_width):
    """只在空格处换行。泰语没有词间空格，宁可缩小字号也不能把词切断
    （切断会把基辅符号和辅音拆开，读起来就是乱码）。"""
    words = str(text).split()
    if not words:
        return []
    if any(draw.textlength(word, font=font) > max_width for word in words):
        return None  # 有单词单独就放不下 → 让上层缩字号
    lines, line = [], words[0]
    for word in words[1:]:
        test = f"{line} {word}"
        if draw.textlength(test, font=font) <= max_width:
            line = test
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def fit_block(draw, text, level, box_w, box_h, max_lines=None, bold=True):
    """从模板给定字号往下缩，直到整段文字既放得进宽度也放得进高度。"""
    start = int(LEVELS.get(level, 34) * UNIT)
    for size in range(start, 9, -1):
        font = ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)
        lines = wrap(draw, text, font, box_w)
        if lines is None:
            continue
        if max_lines and len(lines) > max_lines:
            continue
        line_h = size * (1.14 if level == "headline" else 1.3)
        if len(lines) * line_h <= box_h:
            return font, size, lines, line_h
    font = ImageFont.truetype(FONT_BOLD if bold else FONT_REG, 12)
    return font, 12, wrap(draw, text, font, box_w), 16


def draw_block(draw, zone, text, level=None, bold=True, single=False):
    if not zone or not text:
        return
    level = level or zone.get("level", "body")
    xs = zone.get("x") or [zone.get("left", [0, 1])[0], zone.get("right", [0, 1])[1]]
    x0, x1 = xs[0] * W, xs[1] * W
    y0, y1 = zone["y"][0] * H, zone["y"][1] * H
    font, size, lines, line_h = fit_block(draw, text, level, x1 - x0, y1 - y0,
                                          max_lines=1 if single else zone.get("maxLines"), bold=bold)
    total = len(lines) * line_h
    y = y0 + max(0, (y1 - y0 - total) / 2) + size
    align = zone.get("align", "left")
    for line in lines:
        width = draw.textlength(line, font=font)
        x = x0 if align == "left" else (x0 + x1) / 2 - width / 2 if align == "center" else x1 - width
        draw.text((x, y - size), line, font=font, fill=(255, 255, 255, 255))
        y += line_h


def draw_icon(draw, x, y, size):
    draw.ellipse([x, y, x + size, y + size], outline=(255, 255, 255, 255), width=max(2, int(size * 0.08)))
    draw.line([x + size * 0.28, y + size * 0.52, x + size * 0.44, y + size * 0.68], fill=(255, 255, 255, 255), width=3)
    draw.line([x + size * 0.44, y + size * 0.68, x + size * 0.74, y + size * 0.34], fill=(255, 255, 255, 255), width=3)


def draw_callouts(draw, zone, items):
    if not zone or not items:
        return
    items = items[: zone.get("count", len(items))]
    mode = zone.get("mode")

    if mode == "columns":
        half = (len(items) + 1) // 2
        columns = [items[:half], items[half:]]
        y0, y1 = zone["y"][0] * H, zone["y"][1] * H
        step = (y1 - y0) / max(1, half)
        for ci, column in enumerate(columns):
            x = (zone["left"] if ci == 0 else zone["right"])[0] * W
            box_w = ((zone["left"] if ci == 0 else zone["right"])[1] * W) - x
            for index, text in enumerate(column):
                cy = y0 + step * index
                font, size, lines, line_h = fit_block(draw, text, "body", box_w * 0.74, step * 0.9, max_lines=1)
                icon = int(size * 0.85)
                baseline = cy + (step - len(lines) * line_h) / 2 + size
                draw_icon(draw, x, baseline - size * 0.85, icon)
                ty = baseline - size
                for line in lines:
                    draw.text((x + icon * 1.55, ty), line, font=font, fill=(255, 255, 255, 255))
                    ty += line_h
        return

    if mode == "grid2x2":
        x0, x1 = zone["x"][0] * W, zone["x"][1] * W
        y0, y1 = zone["y"][0] * H, zone["y"][1] * H
        col_w, row_h = (x1 - x0) / 2, (y1 - y0) / 2
        for index, text in enumerate(items):
            col, row = index % 2, index // 2
            cx, cy = x0 + col * col_w, y0 + row * row_h
            font, size, lines, line_h = fit_block(draw, text, "body", col_w * 0.74, row_h * 0.9, max_lines=1)
            icon = int(size * 0.85)
            baseline = cy + (row_h - len(lines) * line_h) / 2 + size
            draw_icon(draw, cx, baseline - size * 0.85, icon)
            ty = baseline - size
            for line in lines:
                draw.text((cx + icon * 1.55, ty), line, font=font, fill=(255, 255, 255, 255))
                ty += line_h
        return

    # row：等宽三列
    x0, x1 = zone["x"][0] * W, zone["x"][1] * W
    y0, y1 = zone["y"][0] * H, zone["y"][1] * H
    col_w = (x1 - x0) / max(1, len(items))
    for index, text in enumerate(items):
        cx = x0 + col_w * index
        font, size, lines, line_h = fit_block(draw, text, "body", col_w * 0.72, (y1 - y0) * 0.6, max_lines=1)
        icon = int(size * 0.85)
        draw_icon(draw, cx, y0 + (y1 - y0) / 2 - size * 0.45, icon)
        ty = y0 + (y1 - y0) / 2 - size * 0.45
        for line in lines:
            draw.text((cx + icon * 1.55, ty), line, font=font, fill=(255, 255, 255, 255))
            ty += line_h


for key, spec in specs.items():
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    zones = spec["zones"]
    draw_block(draw, zones["brand"], COPY["brand"], single=True)
    draw_block(draw, zones["headline"], COPY["headline"])
    draw_block(draw, zones["subline"], COPY["subline"])
    draw_callouts(draw, zones["callouts"], COPY["callouts"])
    draw_block(draw, zones["statement"], COPY["statement"])
    draw_block(draw, zones["price"], COPY["price"], level="price", single=True)
    draw_block(draw, zones["chips"], "   ·   ".join(COPY["chips"]), single=True)
    draw_block(draw, zones["fine"], COPY["fine"], single=True)

    board = Image.new("RGBA", (W, H), (22, 24, 28, 255))
    bd = ImageDraw.Draw(board)
    for name, zone in zones.items():
        xs = zone.get("x") or [zone.get("left", [0])[0], zone.get("right", [1])[1]]
        bd.rectangle([xs[0] * W, zone["y"][0] * H, xs[1] * W, zone["y"][1] * H], outline=(80, 200, 255, 160), width=1)
    board.alpha_composite(layer)

    layer.save(OUT / f"text-layer-{key}.png")
    board.convert("RGB").save(OUT / f"text-layer-{key}-on-dark.jpg", quality=92)
    print(f"ok  {spec['name']:<15} {key}")

print("\n完成：三张透明文字层 + 三张带分区框的对照图")
