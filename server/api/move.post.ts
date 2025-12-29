import fs from 'fs';
import path from 'path';
import { createError, readBody } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    sourcePath?: string;
    targetDir?: string;
  }>(event);

  if (!body || !body.sourcePath || body.targetDir === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sourcePath or targetDir' });
  }

  const normalizedSource = path.normalize(body.sourcePath).replace(/^(\.\.[/\\])+/, '');
  const normalizedTarget = path
    .normalize(body.targetDir || '')
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[\\/]+/, '');

  const sourcePath = path.join(ROOT_DIR, normalizedSource);
  const targetDir = path.join(ROOT_DIR, normalizedTarget);

  const resolvedRoot = path.resolve(ROOT_DIR);
  const resolvedSource = path.resolve(sourcePath);
  const resolvedTarget = path.resolve(targetDir);

  if (!resolvedSource.startsWith(resolvedRoot) || !resolvedTarget.startsWith(resolvedRoot)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' });
  }

  if (!fs.existsSync(sourcePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Source not found' });
  }

  if (!fs.existsSync(targetDir)) {
    throw createError({ statusCode: 404, statusMessage: 'Target directory not found' });
  }

  const stat = fs.statSync(targetDir);
  if (!stat.isDirectory()) {
    throw createError({ statusCode: 400, statusMessage: 'Target is not a directory' });
  }

  const fileName = path.basename(sourcePath);
  const targetPath = path.join(targetDir, fileName);

  // 检查目标位置是否已存在同名文件
  if (fs.existsSync(targetPath)) {
    throw createError({ statusCode: 409, statusMessage: 'File already exists in target directory' });
  }

  // 移动文件
  fs.renameSync(sourcePath, targetPath);

  return { success: true };
});

