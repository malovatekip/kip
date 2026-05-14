"""
Run this locally from backend/ to generate PWA icons from the KIP logo.
Place the output icons/ folder inside frontend/public/

Usage:
    pip install Pillow
    python generate_icons.py
"""
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Run: pip install Pillow")
    sys.exit(1)

LOGO_PATHS = [
    'kip_logo_v2.png',
    'kip_logo.png',
    '../kip_logo_v2.png',
    '../kip_logo.png',
]

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
OUT_DIR = 'icons_output'
os.makedirs(OUT_DIR, exist_ok=True)

# Find logo
logo_path = None
for p in LOGO_PATHS:
    if os.path.exists(p):
        logo_path = p
        break

if not logo_path:
    print("Logo not found. Creating placeholder icons with KIP text.")
    # Create placeholder with KIP branding
    for size in SIZES:
        img = Image.new('RGBA', (size, size), (8, 11, 16, 255))
        d = ImageDraw.Draw(img)
        # Background gradient circle
        margin = int(size * 0.1)
        d.ellipse([margin, margin, size-margin, size-margin],
                  fill=(43, 127, 255, 255))
        # Save
        out = os.path.join(OUT_DIR, f'icon-{size}.png')
        img.save(out, 'PNG')
        print(f'  Created placeholder: {out}')
else:
    print(f"Using logo: {logo_path}")
    logo = Image.open(logo_path).convert('RGBA')

    for size in SIZES:
        # Create background
        bg = Image.new('RGBA', (size, size), (8, 11, 16, 255))

        # Add rounded blue background circle
        mask = Image.new('L', (size, size), 0)
        d = ImageDraw.Draw(mask)
        radius = int(size * 0.22)
        d.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)

        # Blue gradient background
        bg_blue = Image.new('RGBA', (size, size), (27, 95, 204, 255))
        bg.paste(bg_blue, mask=mask)

        # Resize and center logo (60% of icon size)
        logo_size = int(size * 0.62)
        logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
        offset = (size - logo_size) // 2
        bg.paste(logo_resized, (offset, offset), logo_resized)

        out = os.path.join(OUT_DIR, f'icon-{size}.png')
        bg.save(out, 'PNG')
        print(f'  Created: {out} ({size}x{size})')

print(f"\nDone. Copy the '{OUT_DIR}/' folder to frontend/public/icons/")
