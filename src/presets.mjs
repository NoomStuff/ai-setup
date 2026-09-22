import { relative, resolve, sep } from 'node:path';
import { exists, home } from './env.mjs';

export const presets = {
  agents: { name: 'Agent Skills standard', detect: ['.agents'], skills: ['.agents', 'skills'], always: true },
  codex: { name: 'OpenAI Codex', detect: ['.codex'], instructions: ['.codex', 'AGENTS.md'], skills: ['.codex', 'skills'] },
  claude: { name: 'Claude Code', detect: ['.claude'], instructions: ['.claude', 'CLAUDE.md'], skills: ['.claude', 'skills'] },
  gemini: { name: 'Gemini CLI', detect: ['.gemini'], instructions: ['.gemini', 'GEMINI.md'], skills: ['.gemini', 'skills'] },
  copilot: { name: 'GitHub Copilot CLI', detect: ['.copilot'], instructions: ['.copilot', 'copilot-instructions.md'], skills: ['.copilot', 'skills'] },
  cursor: { name: 'Cursor', detect: ['.cursor'], instructions: ['.cursor', 'rules', 'ai-setup.md'], skills: ['.cursor', 'skills'] },
  windsurf: { name: 'Windsurf', detect: ['.codeium', 'windsurf'], instructions: ['.codeium', 'windsurf', 'memories', 'global_rules.md'], skills: ['.windsurf', 'skills'] },
  cline: { name: 'Cline', detect: ['.cline'], instructions: ['.cline', 'rules', 'ai-setup.md'], skills: ['.cline', 'skills'] },
  roo: { name: 'Roo Code', detect: ['.roo'], instructions: ['.roo', 'rules', 'ai-setup.md'], skills: ['.roo', 'skills'] },
  opencode: { name: 'OpenCode', detect: ['.config', 'opencode'], instructions: ['.config', 'opencode', 'AGENTS.md'], skills: ['.config', 'opencode', 'skills'] },
  antigravity: { name: 'Google Antigravity', detect: ['.gemini', 'antigravity'], skills: ['.gemini', 'antigravity', 'skills'] },
  kiro: { name: 'Kiro', detect: ['.kiro'], skills: ['.kiro', 'skills'] },
  amp: { name: 'Amp', detect: ['.config', 'amp'], skills: ['.config', 'amp', 'skills'] },
  goose: { name: 'Goose', detect: ['.config', 'goose'], skills: ['.config', 'goose', 'skills'] },
  zcode: { name: 'ZCode', detect: ['.zcode'], instructions: ['.zcode', 'AGENTS.md'], skills: ['.zcode', 'skills'] }
};

export function harnesses(config) {
  return config.enabledHarnesses.map(id => {
    const value = presets[id];
    if (!value) throw new Error(`Unknown harness "${id}" in local preferences.`);
    return { id, ...value };
  });
}

export function targetPath(parts) {
  if (!Array.isArray(parts) || !parts.length) throw new Error('Harness paths must be non-empty arrays.');
  const target = resolve(home, ...parts);
  const prefix = home.endsWith(sep) ? home : home + sep;
  if (target !== home && !target.startsWith(prefix)) throw new Error(`Target escapes the home directory: ${target}`);
  return target;
}

export async function harnessIsInstalled(harness) {
  return exists(targetPath(harness.detect));
}

export async function harnessWillInstall(harness, config) {
  return (await harnessIsInstalled(harness)) || harness.always === true || config.installMissing === true;
}

export function relativeHome(path) {
  const value = relative(home, path).split(sep).join('/');
  return value ? `~/${value}` : '~';
}
