#!/usr/bin/env python3
  """同步仓库文件到七牛云对象存储。"""

  import os
  import sys
  from qiniu import Auth, put_file, BucketManager

  IGNORE_DIRS = {
      '.git', '.github', '.superpowers', 'docs', 'design-system',
      'research', 'tests', 'screenshots', 'scripts', 'workers',
      '.claude', 'node_modules', '__pycache__',
  }

  IGNORE_EXT = {
      '.py', '.md', '.txt', '.log', '.tmp', '.bak', '.pyc',
      '.toml', '.jsonc', '.yaml', '.yml',
  }

  IGNORE_ROOT_FILES = {
      '.assetsignore', '.gitignore', 'dev-server.py', 'generate_thumbs.py',
      '部署流程与操作规范.txt', 'README.md',
  }


  def should_skip_dir(dirname):
      return dirname in IGNORE_DIRS or dirname.startswith('.')


  def should_skip_file(filename):
      ext = os.path.splitext(filename)[1].lower()
      if ext in IGNORE_EXT:
          return True
      if filename in IGNORE_ROOT_FILES:
          return True
      return False


  def main():
      access_key = os.environ.get('QINIU_ACCESS_KEY')
      secret_key = os.environ.get('QINIU_SECRET_KEY')
      bucket_name = os.environ.get('QINIU_BUCKET')

      if not all([access_key, secret_key, bucket_name]):
          print('✗ 缺少七牛云凭证环境变量', file=sys.stderr)
          sys.exit(1)

      q = Auth(access_key, secret_key)
      bm = BucketManager(q)

      total = 0
      success = 0
      failed = []

      for root, dirs, files in os.walk('.'):
          dirs[:] = [d for d in dirs if not should_skip_dir(d)]

          for f in files:
              if should_skip_file(f):
                  continue

              local_path = os.path.join(root, f)
              remote_key = os.path.relpath(local_path, '.').replace(os.sep, '/')
              if '/' not in remote_key and remote_key in IGNORE_ROOT_FILES:
                  continue

              total += 1
              try:
                  token = q.upload_token(bucket_name, remote_key, 3600)
                  ret, info = put_file(token, remote_key, local_path)
                  if info.status_code == 200:
                      success += 1
                      if total <= 20 or total % 50 == 0:
                          print(f'  ✓ {remote_key}')
                  else:
                      failed.append((remote_key, f'status={info.status_code}'))
                      print(f'  ✗ {remote_key}: status={info.status_code}', file=sys.stderr)
              except Exception as e:
                  failed.append((remote_key, str(e)))
                  print(f'  ✗ {remote_key}: {e}', file=sys.stderr)

      print('=' * 50)
      print(f'总计: {total} 文件, 成功: {success}, 失败: {len(failed)}')
      if failed:
          print('失败文件:')
          for k, err in failed[:10]:
              print(f'  - {k}: {err}')
          sys.exit(1)

      try:
          ret, info = bm.list(bucket_name, limit=1)
          if info.status_code == 200:
              print(f'✓ 七牛云空间 {bucket_name} 已就绪')
      except Exception as e:
          print(f'⚠ 无法验证七牛云空间状态: {e}')


  if __name__ == '__main__':
      main()
