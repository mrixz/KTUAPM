import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Find the rules directory at project root
const rulesDir = path.resolve(__dirname, '../../../../rules');

class RuleLoader {
  constructor() {
    this.cache = new Map();
    this._loaded = false;
  }

  async loadAllRules() {
    try {
      if (!fsSync.existsSync(rulesDir)) {
        logger.warn(`Rules directory not found at ${rulesDir}`);
        return;
      }

      const schemeDirs = await fs.readdir(rulesDir, { withFileTypes: true });
      for (const schemeDirent of schemeDirs) {
        if (schemeDirent.isDirectory() && schemeDirent.name !== 'schema') {
          const schemePath = path.join(rulesDir, schemeDirent.name);
          const files = await fs.readdir(schemePath);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const fullPath = path.join(schemePath, file);
              const content = await fs.readFile(fullPath, 'utf-8');
              const ruleSet = JSON.parse(content);
              const key = `${ruleSet.scheme}_${ruleSet.version}`;
              this.cache.set(key, ruleSet);
              // Also store latest version for scheme
              this.cache.set(`latest_${ruleSet.scheme}`, ruleSet);
              logger.info(`Loaded ruleset: ${key} (${ruleSet.title})`);
            }
          }
        }
      }
      this._loaded = true;
    } catch (err) {
      logger.error(`Failed to load rulesets: ${err.message}`);
    }
  }

  getRuleSet(scheme, version) {
    if (version) {
      const key = `${scheme}_${version}`;
      if (this.cache.has(key)) return this.cache.get(key);
    }
    return this.cache.get(`latest_${scheme}`) || null;
  }

  getAllRuleSets() {
    const list = [];
    for (const [key, val] of this.cache.entries()) {
      if (!key.startsWith('latest_')) {
        list.push(val);
      }
    }
    return list;
  }
}

export const ruleLoader = new RuleLoader();
// Eagerly initiate loading
await ruleLoader.loadAllRules().catch(() => {});
