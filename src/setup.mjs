#!/usr/bin/env node
import { stdin as input, stdout as output } from 'node:process';
import { args, command } from './env.mjs';
import { loadConfig } from './config.mjs';
import { install, setAutostart, sourceSkillNames, verify, watch } from './operations.mjs';
import { harnessIsInstalled, presets } from './presets.mjs';
import { menuPrompt } from './prompt.mjs';
import { menuTui } from './tui.mjs';
import { dim, green, harnessStatus, printHeader, printSkillOptions, skillInfoFor } from './ui.mjs';

async function menu(config) {
  const noTui = args.includes('--no-tui');
  if (!noTui && (input.isTTY ?? false) && (output.isTTY ?? false) && typeof input.setRawMode === 'function') {
    try {
      await menuTui(config);
      return;
    } catch (error) {
      console.error(`Fullscreen menu unavailable (${error.message}), using basic menu.`);
    }
  }
  await menuPrompt(config);
}

try {
  const config = await loadConfig();
  if (command === 'menu') await menu(config);
  else if (command === 'install') await install(config);
  else if (command === 'verify') await verify(config);
  else if (command === 'watch') await watch(config);
  else if (command === 'autostart') await setAutostart(true, config.autoFetch);
  else if (command === 'no-autostart') await setAutostart(false);
  else if (command === 'list') {
    const rows = [];
    for (const [id, harness] of Object.entries(presets)) {
      const detected = await harnessIsInstalled(harness);
      rows.push({
        key: id,
        name: harness.name,
        enabled: config.enabledHarnesses.includes(id),
        detected,
        willCreate: !detected && (harness.always === true || config.installMissing === true)
      });
    }
    printHeader('Harnesses', `${config.enabledHarnesses.length} enabled of ${rows.length}`);
    const nameWidth = Math.max(...rows.map(row => row.name.length));
    for (const row of rows) {
      const box = row.enabled ? green('[x]') : dim('[ ]');
      console.log(`  ${box}  ${row.name.padEnd(nameWidth)}  ${harnessStatus(row.detected, row.willCreate)}  ${dim(row.key)}`);
    }
    console.log();
    const allSkills = await sourceSkillNames();
    const info = skillInfoFor(config, allSkills);
    printHeader('Skills', info.detail);
    printSkillOptions(allSkills.map((name, index) => ({
      key: index + 1,
      name,
      enabled: !config.disabledSkills.includes(name)
    })));
  }
  else throw new Error(`Unknown command "${command}".`);
} catch (error) {
  console.error(`ai-setup: ${error.message}`);
  process.exitCode = 1;
}
