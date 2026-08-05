"""截图 ScrollStory 验证 frame 完整显示 + 容器尺寸"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        await page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(2500)  # 等 loader 关闭 + ScrollStory 加载

        # 滚到 ScrollStory 区域
        await page.evaluate("document.getElementById('scroll-story').scrollIntoView({behavior:'instant', block:'center'})")
        await page.wait_for_timeout(1500)

        # 截 ScrollStory section
        story = page.locator('#scroll-story')
        info = await page.evaluate("""() => {
            const s = document.getElementById('scroll-story');
            const c = document.getElementById('scrollStoryCanvas');
            const sr = s.getBoundingClientRect();
            const cr = c.getBoundingClientRect();
            return {
                section: {w: sr.width, h: sr.height, ratio: sr.width / sr.height},
                canvas: {w: cr.width, h: cr.height, ratio: cr.width / cr.height},
                sectionAspect: getComputedStyle(s).aspectRatio,
            };
        }""")
        print('Section:', info['section'])
        print('Canvas:', info['canvas'])
        print('CSS aspect-ratio:', info['sectionAspect'])

        await story.screenshot(path='tests/_g_shots/fix-scrollstory-container.png')
        print('saved: fix-scrollstory-container.png')

        # 滚到 ScrollStory 中段（看 frame 中间）
        await page.evaluate("""() => {
            const ts = window.ScrollTrigger.getAll().find(t => t.trigger && t.trigger.id === 'scroll-story');
            if (ts) window.scrollTo(0, ts.start + (ts.end - ts.start) * 0.5);
        }""")
        await page.wait_for_timeout(1500)
        await page.screenshot(path='tests/_g_shots/fix-scrollstory-mid.png', full_page=False)
        print('saved: fix-scrollstory-mid.png')

        await browser.close()


asyncio.run(main())