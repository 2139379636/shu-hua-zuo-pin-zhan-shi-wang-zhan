"""
为 19 张作品生成 marquee 缩略图（性能优化）
原图 400-700KB → 缩略图 ~30KB，38 个 tile 总和从 15MB 降到 1.1MB
"""
import os
from PIL import Image
import sys

SRC = "素材"
DST = os.path.join(SRC, "thumbs")
os.makedirs(DST, exist_ok=True)

# marquee tile 实际显示尺寸 320×400，缩略图 240×300 即可（浏览器会缩放）
THUMB_W, THUMB_H = 240, 300
QUALITY = 75

count = 0
total_in = 0
total_out = 0

for i in range(1, 20):
    src_path = os.path.join(SRC, f"{i}.jpg")
    dst_path = os.path.join(DST, f"{i}.jpg")
    if not os.path.exists(src_path):
        print(f"  [SKIP] {src_path} 不存在")
        continue
    try:
        with Image.open(src_path) as im:
            in_size = os.path.getsize(src_path)
            total_in += in_size
            # 保持比例缩放
            im.thumbnail((THUMB_W, THUMB_H), Image.LANCZOS)
            # 转换 RGB（去除 alpha 通道，JPEG 不支持）
            if im.mode in ("RGBA", "P", "LA"):
                im = im.convert("RGB")
            im.save(dst_path, "JPEG", quality=QUALITY, optimize=True)
            out_size = os.path.getsize(dst_path)
            total_out += out_size
            print(f"  [OK] {i}.jpg: {in_size//1024}KB -> {out_size//1024}KB ({out_size*100//in_size}%)")
            count += 1
    except Exception as e:
        print(f"  [ERR] {src_path}: {e}")

print(f"\n=== 总计 ===")
print(f"  生成 {count} 张缩略图")
print(f"  原图总: {total_in//1024}KB ({total_in/1024/1024:.1f}MB)")
print(f"  缩略图总: {total_out//1024}KB ({total_out/1024/1024:.1f}MB)")
print(f"  节省: {(total_in-total_out)//1024}KB ({(total_in-total_out)*100//total_in}%)")
