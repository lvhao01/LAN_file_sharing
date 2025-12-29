import fs from 'fs';
import path from 'path';
import { createError, readBody } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');
const TMP_DIR = path.join(ROOT_DIR, '.upload_tmp');

export default defineEventHandler(async (event) => {
  const body = await readBody<{ uploadId?: string }>(event);
  if (!body || !body.uploadId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing uploadId' });
  }

  const dir = path.join(TMP_DIR, body.uploadId);
  if (!fs.existsSync(dir)) {
    return { uploaded: [] };
  }

  const files = fs.readdirSync(dir);
  const uploaded = files
    .map((name) => {
      const m = name.match(/^(\d+)\.part$/);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => n !== null) as number[];

  return { uploaded };
});


