import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.versions.bun && Number(process.versions.node.split('.')[0]) < 18) {
  throw new Error('AI setup needs Node.js 18 or newer.');
}

export const scriptPath = fileURLToPath(import.meta.url);
export const root = dirname(dirname(scriptPath));
export const configPath = join(root, 'config.json');
export const defaultConfigPath = join(dirname(scriptPath), 'default-config.json');
export const sourceInstructions = join(root, 'AGENTS.md');
export const sourceSkills = join(root, 'skills');
export const args = process.argv.slice(2);
export const command = args[0] ?? 'menu';
const homeFlag = args.indexOf('--home');
export const home = resolve(homeFlag >= 0 ? args[homeFlag + 1] : homedir());
export const statePath = join(home, '.ai-setup-state', `${Buffer.from(root).toString('base64url')}.json`);

export const exists = path => access(path, constants.F_OK).then(() => true, () => false);
export const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');
