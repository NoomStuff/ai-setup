import { readFile, writeFile } from 'node:fs/promises';
import { configPath, defaultConfigPath, exists } from './env.mjs';
import { presets } from './presets.mjs';

export async function loadConfig() {
  const base = JSON.parse(await readFile(defaultConfigPath, 'utf8'));
  const hasUserConfig = await exists(configPath);
  const local = JSON.parse(await readFile(configPath, 'utf8').catch(() => '{}'));
  const config = {
    ...base,
    ...local
  };
  if (typeof config.runOnStartup !== 'boolean') throw new Error('runOnStartup must be true or false.');
  if (typeof config.autoFetch !== 'boolean') throw new Error('autoFetch must be true or false.');
  config.installMissing ??= false;
  if (typeof config.installMissing !== 'boolean') throw new Error('installMissing must be true or false.');
  config.enabledHarnesses ??= Object.keys(presets);
  if (!Array.isArray(config.enabledHarnesses) || config.enabledHarnesses.some(id => typeof id !== 'string')) {
    throw new Error('enabledHarnesses must be a list of harness IDs.');
  }
  config.disabledSkills ??= [];
  if (!Array.isArray(config.disabledSkills) || config.disabledSkills.some(name => typeof name !== 'string')) {
    throw new Error('disabledSkills must be a list of skill names.');
  }
  if (!hasUserConfig) await savePreferences(config);
  return config;
}

export async function savePreferences(config) {
  const preferences = {
    enabledHarnesses: config.enabledHarnesses,
    disabledSkills: config.disabledSkills,
    installMissing: config.installMissing,
    runOnStartup: config.runOnStartup,
    autoFetch: config.autoFetch
  };
  await writeFile(configPath, JSON.stringify(preferences, null, 2) + '\n');
}
