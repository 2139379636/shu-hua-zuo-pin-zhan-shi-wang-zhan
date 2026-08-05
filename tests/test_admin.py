"""admin.html 隐藏管理入口测试
- 8 个用例：覆盖入口校验、列表、编辑、删除、添加、导出、导入、恢复默认。
- 使用 Playwright 真实 Chromium 验证。
"""
import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8080'
ADMIN_URL = f'{BASE}/admin.html'
SECRET = 'hgm-admin'

# 存储截图（便于人工核查）
SCREENSHOT_DIR = Path(__file__).parent / 'screenshots'
SCREENSHOT_DIR.mkdir(exist_ok=True)


async def fresh_admin_page(browser):
    """每次创建新 page，并清空 localStorage（避免脏数据）"""
    ctx = await browser.new_context()
    page = await ctx.new_page()
    page.on('pageerror', lambda e: print(f'  [!] pageerror: {e}'))
    page.on('console', lambda m: print(f'  [console.{m.type}] {m.text}') if m.type in ('error', 'warning', 'log') else None)
    await page.goto(f'{ADMIN_URL}?key={SECRET}', wait_until='networkidle')
    await page.wait_for_timeout(400)
    # 清空 localStorage 中的 admin 数据
    await page.evaluate("""
      () => {
        localStorage.removeItem('hgm_admin_artworks');
        localStorage.removeItem('hgm_admin_poems');
        localStorage.removeItem('hgm_admin_brand');
        localStorage.removeItem('hgm_admin_meta');
      }
    """)
    await page.reload(wait_until='networkidle')
    await page.wait_for_timeout(400)
    return ctx, page


async def run(browser):
    overall_ok = True

    # ---------- T1: 错误口令 ----------
    print('===== T1: 错误口令 =====')
    ctx = await browser.new_context()
    page = await ctx.new_page()
    await page.goto(f'{ADMIN_URL}?key=wrong-key', wait_until='networkidle')
    await page.wait_for_timeout(400)
    auth_visible = await page.locator('#authGate').is_visible()
    panel_visible = await page.locator('#adminPanel').is_visible()
    error_text = await page.locator('#authError').text_content()
    print(f'  入口校验页可见: {auth_visible}  (预期 True)')
    print(f'  管理面板可见: {panel_visible}  (预期 False)')
    print(f'  错误提示: {error_text.strip()!r}  (预期 "口令错误")')
    if not auth_visible or panel_visible or '错误' not in (error_text or ''):
        overall_ok = False
    await ctx.close()

    # ---------- T2: 正确口令 + T3: 渲染 19 张 ----------
    print('\n===== T2/T3: 正确口令 + 渲染 19 张 =====')
    ctx, page = await fresh_admin_page(browser)
    panel_visible = await page.locator('#adminPanel').is_visible()
    rows = await page.locator('.admin-row').count()
    print(f'  管理面板可见: {panel_visible}  (预期 True)')
    print(f'  作品行数: {rows}  (预期 19)')
    if not panel_visible or rows != 19:
        overall_ok = False
    await page.screenshot(path=str(SCREENSHOT_DIR / 'admin-list.png'))
    print(f'  截图: {SCREENSHOT_DIR / "admin-list.png"}')

    # ---------- T4: 编辑保存 ----------
    print('\n===== T4: 编辑保存 =====')
    first_row = page.locator('.admin-row').first
    await first_row.locator('button[data-act="edit"]').click()
    await page.wait_for_timeout(300)
    drawer_open = await page.locator('.admin-drawer.is-open').count()
    print(f'  编辑抽屉打开: {drawer_open}  (预期 1)')
    if drawer_open != 1:
        overall_ok = False
    # 修改标题
    new_title = '测试修改 - 清江一曲绕山流 ★'
    await page.fill('input[name="title"]', new_title)
    await page.click('button#btnSave')
    await page.wait_for_timeout(400)
    # 验证第一行标题变了
    first_title = await page.locator('.admin-row').first.locator('div > div:first-child').text_content()
    print(f'  第一行新标题: {first_title.strip()!r}')
    if new_title not in (first_title or ''):
        overall_ok = False
    # 验证 localStorage 持久化
    stored = await page.evaluate("() => JSON.parse(localStorage.getItem('hgm_admin_artworks') || '[]')")
    persisted = any(a.get('title') == new_title for a in stored)
    print(f'  localStorage 持久化: {persisted}  (预期 True)')
    if not persisted:
        overall_ok = False

    # ---------- T5: 真删除 ----------
    print('\n===== T5: 真删除 =====')
    rows_before = await page.locator('.admin-row').count()
    # 点 id=19 的删除按钮（避免和已修改的 id=1 混淆）
    last_row = page.locator('.admin-row').last
    await last_row.locator('button[data-act="delete"]').click()
    await page.wait_for_timeout(300)
    modal_open = await page.locator('.admin-modal.is-open').count()
    print(f'  删除确认弹窗: {modal_open}  (预期 1)')
    await page.click('button#btnConfirmDelete')
    await page.wait_for_timeout(400)
    rows_after = await page.locator('.admin-row').count()
    print(f'  删除前: {rows_before} / 删除后: {rows_after}  (预期 19 / 18)')
    if rows_after != rows_before - 1:
        overall_ok = False
    # 验证 localStorage 也减了
    stored = await page.evaluate("() => JSON.parse(localStorage.getItem('hgm_admin_artworks') || '[]')")
    print(f'  localStorage 数量: {len(stored)}  (预期 18)')
    if len(stored) != 18:
        overall_ok = False

    # ---------- T6: 添加新作品 ----------
    print('\n===== T6: 添加新作品 =====')
    await page.click('button#btnAdd')
    await page.wait_for_timeout(300)
    await page.fill('input[name="title"]', '新作品测试')
    await page.fill('input[name="image"]', '素材/20.jpg')
    await page.fill('input[name="price"]', '9999')
    await page.click('button#btnSave')
    await page.wait_for_timeout(400)
    rows_after_add = await page.locator('.admin-row').count()
    print(f'  添加后行数: {rows_after_add}  (预期 19)')
    if rows_after_add != 19:
        overall_ok = False
    # 验证 id 是 19（max(id=1..18) + 1）
    last_id = await page.locator('.admin-row').last.evaluate("el => el.dataset.id")
    print(f'  新作品 id: {last_id}  (预期 19)')
    if last_id != '19':
        overall_ok = False

    # ---------- T7: 导出 JSON ----------
    print('\n===== T7: 导出 JSON =====')
    async with page.expect_download() as info:
        await page.click('button#btnExport')
    download = await info.value
    dl_path = SCREENSHOT_DIR.parent / 'tmp-export.json'
    await download.save_as(str(dl_path))
    with open(dl_path, 'r', encoding='utf-8') as f:
        exported = json.load(f)
    print(f'  导出文件: {download.suggested_filename}')
    print(f'  导出作品数: {len(exported["artworks"])}  (预期 19)')
    print(f'  包含诗作: {len(exported["poems"])}  (预期 ≥1)')
    print(f'  包含 brand: {bool(exported.get("brand"))}  (预期 True)')
    if len(exported['artworks']) != 19 or len(exported['poems']) < 1 or not exported.get('brand'):
        overall_ok = False
    dl_path.unlink()
    await page.wait_for_timeout(300)

    # ---------- T8: 导入 JSON ----------
    print('\n===== T8: 导入 JSON =====')
    # 先清空，再导入
    await page.evaluate("() => { localStorage.clear(); }")
    await page.reload(wait_until='networkidle')
    await page.wait_for_timeout(400)
    rows_after_clear = await page.locator('.admin-row').count()
    print(f'  清空后行数: {rows_after_clear}  (预期 19，因为会从默认加载)')
    if rows_after_clear != 19:
        overall_ok = False
    # 构造一个 JSON 文件并上传
    test_json = {
        'version': '2026-07-31',
        'artworks': [
            {'id': 100, 'title': '导入测试作品', 'seal': '甲', 'image': '素材/1.jpg', 'thumb': '素材/1.jpg',
             'category': ['测试'], 'featured': True, 'size': '', 'format': '', 'material': '',
             'year': '2024', 'location': '', 'style': [], 'poemId': None, 'citation': '',
             'description': '', 'price': 1000, 'inStock': True}
        ],
        'poems': [],
        'brand': DEFAULT_BRAND,
    }
    test_path = SCREENSHOT_DIR.parent / 'tmp-import.json'
    with open(test_path, 'w', encoding='utf-8') as f:
        json.dump(test_json, f, ensure_ascii=False)
    # 设置 file input
    file_input = page.locator('input#fileInput')
    await file_input.set_input_files(str(test_path))
    await page.wait_for_timeout(500)
    rows_after_import = await page.locator('.admin-row').count()
    print(f'  导入后行数: {rows_after_import}  (预期 1)')
    if rows_after_import != 1:
        overall_ok = False
    import_title = await page.locator('.admin-row').first.text_content()
    if '导入测试作品' not in (import_title or ''):
        overall_ok = False
    else:
        print(f'  导入作品标题: 包含「导入测试作品」')
    test_path.unlink()

    await ctx.close()
    return overall_ok


# 默认 BRAND 引用（admin.js 中同步）
DEFAULT_BRAND = {
    'name': '黄桂明',
    'shortName': '桂明',
    'tagline': '诗情画意 · 桂林山水',
    'email': 'huang.guiming@art.com',
    'phone': '+86 771 8000 0000',
    'location': '桂林',
    'navMark': '黄',
    'intro': {
        'name': '黄桂明 · 桂林山水',
        'line': '清江一曲绕山流 · 江岸奇峰耸',
    },
}


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ok = await run(browser)
        await browser.close()
        print('\n' + '=' * 46)
        if ok:
            print('PASS - admin 入口全部 8 个用例通过')
            sys.exit(0)
        else:
            print('FAIL - 存在未通过用例')
            sys.exit(1)


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
