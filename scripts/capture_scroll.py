"""通过 pychrome 滚动页面并截图，查看网站不同位置效果"""
import json
import subprocess
import time
import base64
from pathlib import Path

import pychrome


CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
URL = "http://127.0.0.1:8080/index.html"
OUT = Path(r"C:\Users\17316\Desktop\网页8\screenshots")
OUT.mkdir(parents=True, exist_ok=True)
DEBUG_PORT = 9334


def start_chrome() -> subprocess.Popen:
    user_data = OUT / ".chrome-userdata2"
    user_data.mkdir(exist_ok=True)
    args = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--window-size=1440,900",
        f"--remote-debugging-port={DEBUG_PORT}",
        "--remote-allow-origins=*",
        f"--user-data-dir={user_data}",
        URL,
    ]
    return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    proc = start_chrome()
    try:
        # wait for chrome to start
        time.sleep(3)

        browser = pychrome.Browser(url=f"http://127.0.0.1:{DEBUG_PORT}")

        # 列出 tabs，找到我们的 index.html tab
        tabs = browser.list_tab()
        page_tab = None
        for t in tabs:
            url_str = str(t.url) if not isinstance(t.url, str) else t.url
            if "index.html" in url_str or "127.0.0.1:8080" in url_str:
                page_tab = t
                break
        if not page_tab:
            # fallback: 取第一个 page 类型 tab
            for t in tabs:
                if str(t.type) == "page":
                    page_tab = t
                    break
        if not page_tab:
            print("ERROR: page tab not found, available:", [(str(t.type), str(t.url)) for t in tabs])
            return

        page_tab.start()
        page_tab.Page.enable()
        page_tab.Runtime.enable()

        # 等待首屏资源加载
        time.sleep(2.5)

        scroll_points = [
            (0, "01-hero.png", 2500),
            (900, "02-scrollstory-start.png", 3000),
            (1800, "03-scrollstory-mid.png", 3000),
            (3000, "04-marquee.png", 3000),
            (4500, "05-verse.png", 2500),
            (6000, "06-bottom.png", 2000),
        ]

        for scroll_y, fname, wait_ms in scroll_points:
            # 用 JS 滚动：先尝试 Lenis，再 fallback window.scrollTo
            js = f"""
                (() => {{
                    if (window.lenis) {{ window.lenis.scrollTo({scroll_y}, {{immediate: true}}); }}
                    window.scrollTo(0, {scroll_y});
                    return {{ y: window.scrollY, lenis: !!window.lenis }};
                }})()
            """
            r = page_tab.Runtime.evaluate(expression=js, returnByValue=True)
            print(f"  [{fname}] scroll set -> {r.get('result', {}).get('value', r)}")

            time.sleep(wait_ms / 1000)

            shot = page_tab.Page.captureScreenshot(format="png", captureBeyondViewport=False)
            img_b64 = shot["data"]
            (OUT / fname).write_bytes(base64.b64decode(img_b64))
            print(f"[ok] {fname} ({len(base64.b64decode(img_b64))//1024} KB)")

        page_tab.stop()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()