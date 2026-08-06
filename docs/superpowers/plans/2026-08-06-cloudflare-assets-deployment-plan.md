# Cloudflare 静态资源部署过滤修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Cloudflare Wrangler from uploading the repository's `.git` history while preserving every asset currently used by the static gallery website.

**Architecture:** Keep the repository root as the Cloudflare asset directory so all existing relative URLs remain unchanged. Add a root-level `.assetsignore` containing only development-only directories; do not move, rename, or transform website files.

**Tech Stack:** Cloudflare Wrangler static assets, Cloudflare dashboard Git deployment, vanilla HTML/CSS/JavaScript, Python test suite.

---

### Task 1: Add the Wrangler asset exclusion list

**Files:**
- Create: `C:\Users\21393\Desktop\网页8\.assetsignore`

- [ ] **Step 1: Create the ignore file with only non-runtime directories**

Write exactly this content to `C:\Users\21393\Desktop\网页8\.assetsignore`:

```text
.git/
.superpowers/
docs/
design-system/
research/
tests/
screenshots/
scripts/
```

Do not add `workers/`, `素材/`, `lib/`, `data/`, `*.js`, `*.css`, `*.html`, image files, or video files to the exclusion list. The current site uses those paths or may need them for separate deployment workflows.

- [ ] **Step 2: Confirm the file has no broad extension rules**

Run from `C:\Users\21393\Desktop\网页8`:

```bash
python -c "from pathlib import Path; p=Path('.assetsignore'); lines=p.read_text(encoding='utf-8').splitlines(); assert lines == ['.git/','.superpowers/','docs/','design-system/','research/','tests/','screenshots/','scripts/']; print('assetsignore rules: OK')"
```

Expected output:

```text
assetsignore rules: OK
```

### Task 2: Verify current website references remain available

**Files:**
- Read-only checks against: `index.html`, `artist.html`, `gallery.html`, `artwork.html`, `admin.html`, `styles.css`, `ink-effects.js`, `lib/`, `data/`, `素材/`

- [ ] **Step 1: Check that all excluded directories are development-only**

Run:

```bash
python -c "from pathlib import Path; import re; roots=['index.html','artist.html','gallery.html','artwork.html','admin.html','styles.css','ink-effects.js','lib','data','素材','workers']; text='\\n'.join(Path(p).read_text(encoding='utf-8',errors='ignore') for p in roots if Path(p).is_file()); bad=re.findall(r'(?:src|href|fetch\\()\\s*[=\\(]?\\s*[\\\"\\\']([^\\\"\\\']+)',text); hits=[x for x in bad if any(x.startswith(d.rstrip('/')+'/') for d in ['.git','.superpowers','docs','design-system','research','tests','screenshots','scripts'])]; assert not hits, hits; print('runtime references to ignored directories: none')"
```

Expected output:

```text
runtime references to ignored directories: none
```

- [ ] **Step 2: Confirm the assets referenced by the page exist locally**

Run:

```bash
python -c "from pathlib import Path; required=['index.html','artist.html','gallery.html','artwork.html','admin.html','styles.css','ink-effects.js','lib','data/artworks.json','素材/视频切割']; missing=[p for p in required if not Path(p).exists()]; assert not missing, missing; print('runtime asset roots: OK')"
```

Expected output:

```text
runtime asset roots: OK
```

### Task 3: Run the existing tests before deployment verification

**Files:**
- Read-only execution of: `tests/test_admin.py`, `tests/test_intro_overlay_sync.py`, `tests/test_marquee_rows.py`, and the remaining `tests/` suite

- [ ] **Step 1: Run the repository test suite**

Run from `C:\Users\21393\Desktop\网页8`:

```bash
python -m pytest tests -q
```

Expected result: the existing tests pass, or any failure is reported as a pre-existing environment/test dependency issue rather than changed application behavior. No test files are modified for this deployment-only change.

### Task 4: Verify Wrangler's filtered asset manifest

**Files:**
- Read-only verification of the Wrangler asset manifest using `C:\Users\21393\Desktop\网页8\.assetsignore`

- [ ] **Step 1: Run a local Wrangler dry-run without deploying**

Run:

```bash
npx wrangler deploy --dry-run --assets . --name web-8 --compatibility-date 2026-08-06
```

Expected result: Wrangler completes the dry-run without the `51.8 MiB .git/objects/pack` error, and the generated asset list contains the site files while containing no path beginning with `.git/`.

- [ ] **Step 2: Check the dry-run output for the former failing path**

Confirm the output does not contain either of these strings:

```text
.git/objects/pack/
资源过大
```

Also confirm it still references these runtime paths:

```text
index.html
styles.css
lib/
data/artworks.json
素材/视频切割/
```

### Task 5: Prepare the Cloudflare dashboard redeploy

**Files:**
- No additional source changes

- [ ] **Step 1: Review the pending local change**

Run:

```bash
git -C "C:\Users\21393\Desktop\网页8" status --short
```

Expected result: `.assetsignore` is listed as the deployment configuration change, and no website source file is modified.

- [ ] **Step 2: Use the existing Cloudflare Git deployment settings**

In the Cloudflare dashboard, keep the existing repository, branch, and deployment command. Trigger a new deployment after the `.assetsignore` change is available in the connected branch.

Expected result: the build no longer scans the Git pack as an asset, and the deployment proceeds past the previous 25 MiB resource error.

- [ ] **Step 3: Smoke-test the deployed site**

Open the deployed URL and verify the golden paths:

1. Home page loads `index.html` and `styles.css`.
2. Hero image transition loads `有画.png` and `留白.png`.
3. Scroll story loads frames from `素材/视频切割/`.
4. Gallery images load from `素材/`.
5. Artist, artwork, and admin pages open without missing-script errors.

No Git commit, push, or Cloudflare deployment action is performed by the local implementation unless separately authorized by the user.
