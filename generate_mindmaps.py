#!/usr/bin/env python3
"""Generate missing mindmap webp files from source PDFs/JPGs."""

import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont
import json, os, io

ROOT = r'C:\Users\cramc\Desktop\english-grammar-app'
MINDMAP_DIR = os.path.join(ROOT, 'mindmaps')
SOURCE_DIR = r'C:\Users\cramc\Desktop\英语语法学习\语法专项训练篇\思维导图\语法专练思维导图'

os.makedirs(MINDMAP_DIR, exist_ok=True)

def jpg_to_webp(src_path, dst_name, max_width=1600):
    """Convert JPG to optimized webp."""
    img = Image.open(src_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h * ratio)), Image.LANCZOS)
    dst = os.path.join(MINDMAP_DIR, dst_name)
    img.save(dst, 'webp', quality=85, method=6)
    size_kb = os.path.getsize(dst) / 1024
    print(f'  [JPG→webp] {dst_name} ({size_kb:.0f} KB)')
    return img

def pdf_to_webp(src_path, dst_name, max_width=1600):
    """Render PDF first page to webp."""
    doc = fitz.open(src_path)
    page = doc[0]
    # Render at 200 DPI for good quality
    mat = fitz.Matrix(200/72, 200/72)
    pix = page.get_pixmap(matrix=mat)
    img = Image.open(io.BytesIO(pix.tobytes('png')))
    if img.mode != 'RGB':
        img = img.convert('RGB')
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h * ratio)), Image.LANCZOS)
    dst = os.path.join(MINDMAP_DIR, dst_name)
    img.save(dst, 'webp', quality=85, method=6)
    size_kb = os.path.getsize(dst) / 1024
    print(f'  [PDF→webp] {dst_name} ({size_kb:.0f} KB)')
    doc.close()
    return img

def combine_images_vertical(images, dst_name, max_width=1600, bg_color=(255,255,255)):
    """Stack images vertically with padding."""
    imgs = [Image.open(img) if isinstance(img, str) else img for img in images]
    for i, im in enumerate(imgs):
        if im.mode != 'RGB':
            imgs[i] = im.convert('RGB')

    target_w = min(max_width, max(im.width for im in imgs))
    resized = []
    for im in imgs:
        if im.width > target_w:
            ratio = target_w / im.width
            im = im.resize((target_w, int(im.height * ratio)), Image.LANCZOS)
        resized.append(im)

    total_h = sum(im.height for im in resized) + 40 * (len(resized) + 1)  # padding
    combined = Image.new('RGB', (target_w, total_h), bg_color)

    draw = ImageDraw.Draw(combined)
    y = 20
    for i, im in enumerate(resized):
        x = (target_w - im.width) // 2
        combined.paste(im, (x, y))
        y += im.height + 40

    dst = os.path.join(MINDMAP_DIR, dst_name)
    combined.save(dst, 'webp', quality=85, method=6)
    size_kb = os.path.getsize(dst) / 1024
    print(f'  [COMBINE] {dst_name} ({size_kb:.0f} KB)')
    return combined

def generate_text_mindmap(dst_name, title, sections, max_width=1200):
    """Generate a text-based mindmap image for modules without source images."""
    # Dark theme matching the app
    bg_color = (26, 26, 26)        # dark bg
    card_bg = (40, 40, 45)         # card background
    accent = (0, 180, 160)          # teal accent
    text_color = (230, 230, 230)    # light text
    muted = (160, 160, 165)         # muted text
    warning = (255, 160, 60)        # warning/example color

    # Font setup
    font_paths = [
        'C:/Windows/Fonts/msyh.ttc',       # Microsoft YaHei
        'C:/Windows/Fonts/simhei.ttf',      # SimHei
        'C:/Windows/Fonts/simsun.ttc',      # SimSun
    ]
    title_font = None
    body_font = None
    small_font = None

    for fp in font_paths:
        if os.path.exists(fp):
            try:
                title_font = ImageFont.truetype(fp, 28)
                body_font = ImageFont.truetype(fp, 16)
                small_font = ImageFont.truetype(fp, 13)
                break
            except:
                continue

    if title_font is None:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Calculate layout
    padding = 24
    card_padding = 18
    line_height = 26
    section_gap = 20

    # Measure total height
    total_h = padding * 3  # top + bottom + title area
    for sec in sections:
        total_h += 40  # section header
        lines = sec.get('items', [])
        total_h += len(lines) * line_height + card_padding * 2
        total_h += section_gap

    # Create image
    img = Image.new('RGB', (max_width, total_h), bg_color)
    draw = ImageDraw.Draw(img)

    y = padding

    # Title
    draw.text((padding, y), title, fill=accent, font=title_font)
    y += 50

    # Sections
    for sec in sections:
        sec_title = sec.get('title', '')
        items = sec.get('items', [])

        # Calculate card dimensions
        card_x = padding
        card_w = max_width - padding * 2
        card_h = 36 + len(items) * line_height + card_padding

        # Draw card background
        draw.rounded_rectangle(
            [card_x, y, card_x + card_w, y + card_h],
            radius=10, fill=card_bg
        )

        # Section title
        draw.text((card_x + card_padding, y + 8), sec_title, fill=accent, font=body_font)

        # Items
        item_y = y + 38
        for item in items:
            if isinstance(item, tuple):
                text, color_key = item
                c = warning if color_key == 'warn' else muted if color_key == 'muted' else text_color
            else:
                text = item
                c = text_color
            draw.text((card_x + card_padding + 12, item_y), f'• {text}', fill=c, font=small_font)
            item_y += line_height

        y += card_h + section_gap

    dst = os.path.join(MINDMAP_DIR, dst_name)
    img.save(dst, 'webp', quality=85, method=6)
    size_kb = os.path.getsize(dst) / 1024
    print(f'  [TEXT→webp] {dst_name} ({size_kb:.0f} KB)')
    return img


# ============================================================
# 1. Generate gerund.webp from 第十一章：动名词.jpg
# ============================================================
print('\n=== Step 1: gerund.webp ===')
gerund_jpg = os.path.join(SOURCE_DIR, '第十一章：动名词', '第十一章：动名词.jpg')
if os.path.exists(gerund_jpg):
    jpg_to_webp(gerund_jpg, 'gerund.webp')
else:
    print(f'  [SKIP] Source not found: {gerund_jpg}')

# ============================================================
# 2. Generate adverb.webp from 第六章：副词.pdf
# ============================================================
print('\n=== Step 2: adverb.webp ===')
adverb_pdf = os.path.join(SOURCE_DIR, '第六章副词', '第六章：副词.pdf')
if os.path.exists(adverb_pdf):
    pdf_to_webp(adverb_pdf, 'adverb.webp')
else:
    # Try alternative filename
    alt = os.path.join(SOURCE_DIR, '第六章副词', '第六章：副词1.pdf')
    if os.path.exists(alt):
        pdf_to_webp(alt, 'adverb.webp')
    else:
        print(f'  [SKIP] No adverb PDF found')

# ============================================================
# 3. Generate nonfinite.webp (combine inf + gerund + participle)
# ============================================================
print('\n=== Step 3: nonfinite.webp ===')
inf_jpg = os.path.join(SOURCE_DIR, '第十章：不定式', '第十章：不定式.jpg')
gerund_jpg2 = os.path.join(SOURCE_DIR, '第十一章：动名词', '第十一章：动名词.jpg')
participle_jpg = os.path.join(SOURCE_DIR, '第十二章：分词', '第十二章分词.jpg')

sources = []
for p, label in [(inf_jpg, 'inf'), (gerund_jpg2, 'gerund'), (participle_jpg, 'participle')]:
    if os.path.exists(p):
        sources.append(p)
    else:
        print(f'  [WARN] Missing source for {label}: {p}')

if sources:
    combine_images_vertical(sources, 'nonfinite.webp')
else:
    print('  [SKIP] No sources found for nonfinite')

# ============================================================
# 4. Generate subjunctive.webp from grammar data
# ============================================================
print('\n=== Step 4: subjunctive.webp ===')
modules = json.load(open(os.path.join(ROOT, 'data', 'modules.json'), 'r', encoding='utf-8'))
subj = [m for m in modules['modules'] if m['id'] == 'subjunctive']
if subj:
    subj = subj[0]
    sections = []
    for sm in subj.get('sub_modules', []):
        gs = sm.get('grammar_summary', {})
        rules = gs.get('rules', [])
        if isinstance(rules, str):
            rules = [rules]

        items = []
        for r in rules[:8]:  # Limit to 8 items per section
            # Truncate long rules
            if len(r) > 120:
                r = r[:117] + '...'
            items.append(r)

        if items:
            sections.append({
                'title': f'📌 {sm["name"]}',
                'items': items,
            })

    if sections:
        generate_text_mindmap('subjunctive.webp', '🧠 虚拟语气 — 思维导图', sections)
    else:
        print('  [SKIP] No grammar data for subjunctive')
else:
    print('  [SKIP] subjunctive module not found')

print('\n=== Done ===')
print(f'Files in mindmaps/: {len([f for f in os.listdir(MINDMAP_DIR) if f.endswith(".webp")])} webp files')
