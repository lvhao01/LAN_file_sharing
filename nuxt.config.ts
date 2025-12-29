import { defineNuxtConfig } from 'nuxt/config';
import fs from 'fs';
import os from 'os';
import path from 'path';

export default defineNuxtConfig({
  css: ['~/assets/main.scss'],
  nitro: {
    // Expose fs for server routes
    externals: {
      inline: ['fs', 'path', 'os']
    }
  },
  hooks: {
    'nitro:ready': (nitro) => {
      // 在开发/生产启动时打印局域网访问地址
      const port = nitro.options.dev ? nitro.options.devServer?.port : process.env.PORT || 5000;
      const urls = getLanAddresses(Number(port));
      if (urls.length) {
        // eslint-disable-next-line no-console
        console.log('LAN URLs:');
        urls.forEach((url) => console.log('  ' + url));
      }
    }
  }
});

function getLanAddresses(port: number) {
  const interfaces = os.networkInterfaces();
  const urls: string[] = [];
  Object.values(interfaces).forEach((ifs) => {
    (ifs || [])
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .forEach((i) => {
        if (i && i.address) {
          urls.push(`http://${i.address}:${port}`);
        }
      });
  });
  return urls;
}


