import fs from 'fs';
import path from 'path';
import { createError, readBody } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    path?: string;
    type?: 'file' | 'dir';
  }>(event);

  if (!body || !body.path || !body.type) {
    throw createError({ statusCode: 400, statusMessage: 'Missing path or type' });
  }

  const normalizedRel = path.normalize(body.path).replace(/^(\.\.[/\\])+/, '');
  const targetPath = path.join(ROOT_DIR, normalizedRel);

  const resolvedRoot = path.resolve(ROOT_DIR);
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' });
  }

  if (!fs.existsSync(targetPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Path not found' });
  }

  const stat = fs.statSync(targetPath);

  if (body.type === 'file') {
    if (!stat.isFile()) {
      throw createError({ statusCode: 400, statusMessage: 'Not a file' });
    }
    fs.unlinkSync(targetPath);
  } else if (body.type === 'dir') {
    if (!stat.isDirectory()) {
      throw createError({ statusCode: 400, statusMessage: 'Not a directory' });
    }
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  return { success: true };
});


