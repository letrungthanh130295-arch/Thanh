"""Read the two price columns of Petrolimex's printed grid."""
import io
import json
import re
import subprocess
import sys

from PIL import Image, ImageOps


def lines(image, vertical):
    if vertical:
        image = image.transpose(Image.Transpose.TRANSPOSE)
    width, height = image.size
    result = []
    for y in range(height):
        dark = sum(pixel < 95 for pixel in image.crop((0, y, width, y + 1)).getdata())
        if dark < width * 0.65:
            continue
        if not result or y - result[-1] > 2:
            result.append(y)
        else:
            result[-1] = y
    return result


def read(cell, digits=False):
    bounds = ImageOps.invert(cell.point(lambda p: 255 if p > 110 else 0)).getbbox()
    if bounds:
        cell = cell.crop(bounds)
    cell = ImageOps.expand(cell.resize((cell.width * 2, cell.height * 2), Image.Resampling.LANCZOS), border=12, fill=255)
    def ocr(image):
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        cmd = ["tesseract", "stdin", "stdout", "--psm", "7"]
        if digits:
            cmd += ["-c", "tessedit_char_whitelist=0123456789.,"]
        return subprocess.run(cmd, input=buf.getvalue(), capture_output=True,
                              check=True, timeout=10).stdout.decode().strip()

    primary = ocr(cell)
    if digits:
        alternate = ocr(cell.point(lambda p: 255 if p > 185 else 0))
        if primary != alternate or not re.fullmatch(r"\d{1,2}[.,]\d{3}", primary):
            raise ValueError("Không xác thực được ô giá Petrolimex")
        return int(re.sub(r"\D", "", primary))
    return primary


image = Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("L")
if image.width * image.height > 8_000_000:
    raise ValueError("Ảnh bảng giá quá lớn")
xs, ys = lines(image, True), lines(image, False)
if len(xs) != 5 or not 7 <= len(ys) <= 14:
    raise ValueError("Không nhận dạng được lưới bảng giá Petrolimex")


def crop(col, row):
    return image.crop((xs[col] + 2, ys[row] + 2, xs[col + 1] - 1, ys[row + 1] - 1))


headers = [read(crop(col, 0)) for col in (2, 3)]
rows = []
for row in range(1, len(ys) - 1):
    if ys[row + 1] - ys[row] > (ys[2] - ys[1]) * 2:
        break  # Footnotes are merged across the grid.
    rows.append([read(crop(0, row)), read(crop(1, row)),
                 read(crop(2, row), True), read(crop(3, row), True)])
print(json.dumps({"headers": headers, "rows": rows}))
