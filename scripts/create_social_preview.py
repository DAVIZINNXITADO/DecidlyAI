from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 1200, 630
img = Image.new("RGB", (W, H), (20, 14, 35))
pix = img.load()
for y in range(H):
    for x in range(W):
        t = (x / W + y / H) / 2
        pix[x, y] = (int(24 + 38 * t), int(14 + 18 * t), int(43 + 54 * t))
draw = ImageDraw.Draw(img, "RGBA")
# Decorative glow and cards
draw.ellipse((820, -180, 1380, 380), fill=(139, 92, 246, 45))
draw.ellipse((-260, 430, 360, 970), fill=(59, 130, 246, 28))
draw.rounded_rectangle((720, 112, 1070, 518), radius=32, fill=(255, 255, 255, 18), outline=(255, 255, 255, 45), width=2)
draw.rounded_rectangle((765, 162, 1025, 250), radius=18, fill=(255, 255, 255, 26))
draw.rounded_rectangle((765, 277, 990, 365), radius=18, fill=(139, 92, 246, 80))
draw.rounded_rectangle((765, 392, 955, 480), radius=18, fill=(255, 255, 255, 26))
font_dir = Path("/usr/share/fonts/truetype/dejavu")
regular = str(font_dir / "DejaVuSans.ttf")
bold = str(font_dir / "DejaVuSans-Bold.ttf")
def font(path, size): return ImageFont.truetype(path, size)
# Brand mark
draw.rounded_rectangle((88, 82, 150, 144), radius=18, fill=(167, 139, 250, 255))
draw.text((119, 113), "D", font=font(bold, 42), anchor="mm", fill=(30, 18, 50, 255))
draw.text((172, 91), "DecidlyAI", font=font(bold, 32), fill=(255, 255, 255, 255))
# Headline
draw.text((88, 220), "Mais clareza para", font=font(bold, 58), fill=(255, 255, 255, 255))
draw.text((88, 290), "decisões importantes.", font=font(bold, 58), fill=(216, 180, 254, 255))
draw.text((92, 402), "Organize seus pensamentos, compare possibilidades", font=font(regular, 24), fill=(226, 218, 240, 255))
draw.text((92, 440), "e encontre um caminho mais claro com IA reflexiva.", font=font(regular, 24), fill=(226, 218, 240, 255))
# Simple decision nodes
draw.ellipse((825, 184, 865, 224), fill=(216, 180, 254, 255))
draw.ellipse((925, 300, 965, 340), fill=(255, 255, 255, 220))
draw.ellipse((850, 415, 890, 455), fill=(147, 197, 253, 255))
draw.line((845, 220, 945, 315), fill=(216, 180, 254, 180), width=4)
draw.line((945, 340, 870, 430), fill=(147, 197, 253, 180), width=4)
img.save("public/social-preview.png", "PNG", optimize=True)
print("created public/social-preview.png")
