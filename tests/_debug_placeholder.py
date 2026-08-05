"""调试：检查 getFeaturedArtworks 实际返回值"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        await page.goto('http://127.0.0.1:8080/gallery.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(1500)

        info = await page.evaluate("""() => {
            const arts = window.getFeaturedArtworks();
            const grid = document.getElementById('galleryGrid');
            const cards = grid ? grid.querySelectorAll('.art-card') : [];
            return {
                placeholderOnly: window.PLACEHOLDER_ONLY,
                featuredCount: arts.length,
                featuredSample: arts.slice(0, 2).map(a => ({id: a.id, title: a.title, image: a.image})),
                gridCards: cards.length,
                cardIds: [...cards].map(c => c.getAttribute('data-id')),
                cardTitles: [...cards].map(c => c.querySelector('.art-card__title')?.textContent || ''),
            };
        }""")
        print('info:', info)

        await browser.close()


asyncio.run(main())