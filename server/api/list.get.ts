import fs from 'fs';
import path from 'path';
import { getQuery, createError } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');

type DirentInfo = {
  name: string;
  path: string;
  modifiedTime: Date;
};

type FileInfo = {
  name: string;
  path: string;
  modifiedTime: Date;
  size: number;
};

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const rel = typeof query.path === 'string' ? query.path : '';

  const normalizedRel = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const targetDir = path.join(ROOT_DIR, normalizedRel);

  const resolvedRoot = path.resolve(ROOT_DIR);
  const resolvedTarget = path.resolve(targetDir);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' });
  }

  if (!fs.existsSync(targetDir)) {
    throw createError({ statusCode: 404, statusMessage: 'Directory not found' });
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const dirs: DirentInfo[] = [];
  const files: FileInfo[] = [];

  entries.forEach((entry) => {
    // 隐藏内部上传临时目录
    if (entry.name === '.upload_tmp') {
      return;
    }
    const fullPath = path.join(targetDir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);

    if (entry.isDirectory()) {
      dirs.push({
        name: entry.name,
        path: relPath,
        modifiedTime: stat.mtime
      });
    } else if (entry.isFile()) {
      files.push({
        name: entry.name,
        path: relPath,
        modifiedTime: stat.mtime,
        size: stat.size
      });
    }
  });

  dirs.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return {
    currentPath: normalizedRel.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, ''),
    dirs,
    files
  };
});


