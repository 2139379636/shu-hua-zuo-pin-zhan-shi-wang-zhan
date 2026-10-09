"""
PR2: 把 Hero 留白.png + 有画.png + 19 张 jpg -> webp
- Hero 2 张：<=500KB（full viewport）
- 19 张作品：<=200KB（缩略图）

输出: 素材/留白.webp, 素材/有画.webp, 素材/1.webp ~ 素材/19.webp
不删原文件。components.json 路径由你手动更新。
"""
import io
import os
import sys

# Force UTF-8 stdout (Windows GBK defaults break unicode chars)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# PIL is optional-loaded
try:
    from PIL import Image
except ImportError:
    print("PIL not installed. Run: pip install pillow")
    sys.exit(1)

PROJECT_ROOT = r"C:\Users\17316\Desktop\网页8"
SRC_DIR = os.path.join(PROJECT_ROOT, "素材")

TARGETS = [
    # Hero (full viewport, 在项目根目录)
    {"src_dir": PROJECT_ROOT, "src": "留白.png", "dst": "留白.webp", "max_kb": 500, "long_edge": 1920, "quality": 85},
    {"src_dir": PROJECT_ROOT, "src": "有画.png", "dst": "有画.webp", "max_kb": 500, "long_edge": 1920, "quality": 85},
]
for i in range(1, 20):
    TARGETS.append({
        "src_dir": SRC_DIR, "src": f"{i}.jpg", "dst": f"{i}.webp",
        "max_kb": 200, "long_edge": 800, "quality": 80,
    })

def convert(item):
    base = item.get("src_dir", SRC_DIR)
    src = os.path.join(base, item["src"])
    dst = os.path.join(base, item["dst"])
    if not os.path.exists(src):
        print(f"  [SKIP] {item['src']} (not found at {base})")
        return False
    try:
        im = Image.open(src)
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
        else:
            im = im.convert("RGB")
        w, h = im.size
        long_side = max(w, h)
        if long_side > item["long_edge"]:
            if w >= h:
                nw = item["long_edge"]; nh = int(h * (item["long_edge"] / w))
            else:
                nh = item["long_edge"]; nw = int(w * (item["long_edge"] / h))
            im = im.resize((nw, nh), Image.LANCZOS)
        im.save(dst, "WEBP", quality=item["quality"], method=4)
        size_kb = os.path.getsize(dst) / 1024
        if size_kb > item["max_kb"]:
            im.save(dst, "WEBP", quality=max(60, item["quality"] - 15), method=6)
            size_kb = os.path.getsize(dst) / 1024
        if size_kb > item["max_kb"]:
            im.save(dst, "WEBP", quality=50, method=6)
            size_kb = os.path.getsize(dst) / 1024
        status = "[OK]" if size_kb <= item["max_kb"] else "[OVER]"
        src_w, src_h = w, h  # original size
        out = im.size
        print(f"  {status} {item['src']:>12} -> {item['dst']:<14} {size_kb:6.1f} KB  (orig {src_w}x{src_h} -> {out[0]}x{out[1]}, target <= {item['max_kb']} KB)")
        return True
    except Exception as e:
        print(f"  [FAIL] {item['src']}: {e}")
        return False

def main():
    print(f"Source: {SRC_DIR}")
    ok = 0
    for item in TARGETS:
        if convert(item): ok += 1
    print(f"\nDone: {ok}/{len(TARGETS)} converted")

if __name__ == "__main__":
    main()
