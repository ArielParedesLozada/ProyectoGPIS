import { defineConfig } from "cypress";
import fs from 'fs';
import path from 'path';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        getLastEmail({ email }) {
          const logPath = path.join(__dirname, 'storage/logs/laravel.log');
          const log = fs.readFileSync(logPath, 'utf-8');
          const regex = new RegExp(`To: ${email}[\\s\\S]*?http[^\\s]+`, 'g');
          const matches = log.match(regex);
          if (!matches) return null;
          const urlMatch = matches[matches.length - 1].match(/http[^\s]+/);
          return urlMatch ? { body: urlMatch[0] } : null;
        }
      })
      return config;
    },
  },
});
