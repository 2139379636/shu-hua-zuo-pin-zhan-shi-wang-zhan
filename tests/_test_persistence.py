"""端到端持久化测试：admin 添加 8 个作品 → 作品页立即显示"""
import asyncio
from playwright.async_api import async_playwright


ADMIN_KEY = 'hgm-admin'  # 默认口令


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})

        # 拦截 admin.html 验证流程：直接设 localStorage 跳过口令
        page = await context.new_page()

        # === Step 1: 清理 localStorage，从零开始 ===
        await page.goto('http://127.0.0.1:8080/gallery.html', wait_until='networkidle', timeout=60000)
        await page.evaluate("localStorage.removeItem('hgm_admin_artworks')")
        await page.reload(wait_until='networkidle')
        await page.wait_for_timeout(1500)

        # 验证：占位 6 张
        cards_before = await page.locator('.art-card').count()
        titles_before = await page.evaluate(
            "() => [...document.querySelectorAll('.art-card .art-card__title')].map(e => e.textContent.trim())")
        print(f'Step 1 (clean state) → gallery 卡片数: {cards_before}, 标题: {titles_before}')

        # === Step 2: 进入 admin，添加 8 个作品 ===
        await page.goto('http://127.0.0.1:8080/admin.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(1500)

        # 自动登录：模拟填入口令 + 点击进入
        # 简化路径：直接通过 evaluate 设置 localStorage 的 admin 登录态（admin 不存登录态）
        # 实际需要填表单
        await page.fill('#authKey', ADMIN_KEY)
        await page.click('#authForm button[type="submit"]')
        await page.wait_for_timeout(2000)

        # 验证进入管理面板
        panel_visible = await page.evaluate("document.getElementById('adminPanel').style.display")
        print(f'Step 2 (admin login) → adminPanel display: {panel_visible}')

        # 添加 8 个作品
        for i in range(1, 9):
            await page.click('#btnAdd')
            await page.wait_for_timeout(300)
            await page.fill('input[name="title"]', f'测试作品 {i}')
            await page.fill('input[name="seal"]', f'測{i}')
            await page.fill('input[name="image"]', f'素材/{i}.jpg')
            await page.fill('input[name="thumb"]', f'素材/{i}.jpg')
            await page.fill('input[name="size"]', '100 × 50 cm')
            await page.fill('input[name="format"]', '横幅 · 镜片')
            await page.fill('input[name="material"]', '宣纸 · 水墨')
            await page.fill('input[name="year"]', '2024')
            await page.fill('input[name="price"]', '6800')
            await page.fill('input[name="category"]', '漓江,山水')
            await page.click('#btnSave')
            await page.wait_for_timeout(300)

        # 验证：admin 列表 8 个 + localStorage 有 8 个
        admin_rows = await page.locator('.admin-row').count()
        ls_count = await page.evaluate(
            "() => JSON.parse(localStorage.getItem('hgm_admin_artworks') || '[]').length")
        print(f'Step 2 (add 8) → admin rows: {admin_rows}, localStorage 数量: {ls_count}')

        # === Step 3: 访问 gallery，验证 8 个作品立即可见 ===
        await page.goto('http://127.0.0.1:8080/gallery.html', wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(2000)

        cards_after = await page.locator('.art-card').count()
        titles_after = await page.evaluate(
            "() => [...document.querySelectorAll('.art-card .art-card__title')].map(e => e.textContent.trim())")
        print(f'Step 3 (gallery after admin edit) → 卡片数: {cards_after}, 标题: {titles_after}')

        # === Step 4: 准备 data/artworks.json（写文件）然后清 localStorage 验证 fetch 兜底 ===
        import json
        ls_arts = await page.evaluate("JSON.parse(localStorage.getItem('hgm_admin_artworks'))")
        # 把 admin 数组转换为 {artworks: [...]} 格式（与 exportJSON() 一致）
        payload = {
            'version': '2026-07-31',
            'exportedAt': '2026-08-03T00:00:00.000Z',
            'artworks': ls_arts,
        }
        import os
        os.makedirs(r'C:\Users\17316\Desktop\网页8\data', exist_ok=True)
        with open(r'C:\Users\17316\Desktop\网页8\data\artworks.json', 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f'Step 4: 写入 data/artworks.json ({len(ls_arts)} 个作品)')

        # 清除 localStorage（模拟新浏览器/清缓存）
        await page.evaluate("localStorage.removeItem('hgm_admin_artworks')")
        await page.goto('http://127.0.0.1:8080/gallery.html', wait_until='networkidle', timeout=60000)
        # 等待 fetch + hgm-artworks-loaded 事件触发重渲染
        await page.wait_for_timeout(2500)

        cards_after_fetch = await page.locator('.art-card').count()
        titles_after_fetch = await page.evaluate(
            "() => [...document.querySelectorAll('.art-card .art-card__title')].map(e => e.textContent.trim())")
        ls_after_fetch = await page.evaluate(
            "() => JSON.parse(localStorage.getItem('hgm_admin_artworks') || '[]').length")
        print(f'Step 4 (after fetch data.json): 卡片数={cards_after_fetch}, localStorage={ls_after_fetch}')
        print(f'  标题: {titles_after_fetch}')

        # 清理 data/artworks.json
        os.remove(r'C:\Users\17316\Desktop\网页8\data\artworks.json')

        await context.close()
        await browser.close()

        # 输出结论
        print()
        print('=' * 60)
        pass_count = 0
        if cards_after == 8 and all('测试作品' in t for t in titles_after):
            print('[PASS] Step 3: localStorage 立即反映到作品页')
            pass_count += 1
        if cards_after_fetch == 8 and all('测试作品' in t for t in titles_after_fetch) and ls_after_fetch == 8:
            print('[PASS] Step 4: fetch data/artworks.json 兜底成功，写回 localStorage')
            pass_count += 1
        if pass_count == 2:
            print('[ALL PASS] 端到端持久化验证通过')
        else:
            print(f'[FAIL] {2 - pass_count}/2 验证失败')


asyncio.run(main())