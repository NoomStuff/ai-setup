import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { harnesses, harnessIsInstalled, presets } from './presets.mjs';
import { savePreferences } from './config.mjs';
import { install, setAutostart, sourceSkillNames, verify } from './operations.mjs';
import { ask, menuItems, printHarnessOptions, printHeader, printOptions, printSkillOptions, skillInfoFor } from './ui.mjs';

export async function chooseHarnesses(config, prompt) {
  const ids = Object.keys(presets);
  const rows = [];
  for (const [index, id] of ids.entries()) {
    const detected = await harnessIsInstalled(presets[id]);
    rows.push({
      key: index + 1,
      name: presets[id].name,
      enabled: config.enabledHarnesses.includes(id),
      detected,
      willCreate: !detected && (presets[id].always === true || config.installMissing === true)
    });
  }
  printHeader('Choose harnesses', `${config.enabledHarnesses.length} enabled`);
  printHarnessOptions(rows);
  const rawHarness = await ask(prompt, 'Toggle numbers with commas, "found" enables installed harnesses, Enter keeps this selection: ');
  if (rawHarness === null) return;
  const answer = rawHarness.trim().toLowerCase();
  if (!answer) return;
  if (answer === 'found') {
    config.enabledHarnesses = [];
    for (const id of ids) if (await harnessIsInstalled(presets[id])) config.enabledHarnesses.push(id);
  } else {
    const indexes = answer.split(',').map(value => Number(value.trim()) - 1);
    if (!indexes.length || indexes.some(index => !ids[index])) throw new Error('Enter valid numbers separated by commas.');
    const selected = new Set(config.enabledHarnesses);
    for (const index of indexes) selected.has(ids[index]) ? selected.delete(ids[index]) : selected.add(ids[index]);
    config.enabledHarnesses = ids.filter(id => selected.has(id));
  }
  await savePreferences(config);
  console.log(`\nSaved · ${config.enabledHarnesses.length} enabled`);
}

export async function chooseSkills(config, prompt, allSkills = null) {
  const names = allSkills ?? await sourceSkillNames();
  const rows = names.map((name, index) => ({
    key: index + 1,
    name,
    enabled: !config.disabledSkills.includes(name)
  }));
  const enabledCount = rows.filter(row => row.enabled).length;
  printHeader('Choose skills', `${enabledCount} of ${names.length} enabled`);
  printSkillOptions(rows);
  const rawSkills = await ask(prompt, 'Toggle numbers with commas, "all" enables every skill, "none" disables every skill, Enter keeps this selection: ');
  if (rawSkills === null) return;
  const answer = rawSkills.trim().toLowerCase();
  if (!answer) return;
  if (answer === 'all') {
    config.disabledSkills = [];
  } else if (answer === 'none') {
    config.disabledSkills = [...names];
  } else {
    const indexes = answer.split(',').map(value => Number(value.trim()) - 1);
    if (!indexes.length || indexes.some(index => !names[index])) throw new Error('Enter valid numbers separated by commas.');
    const disabled = new Set(config.disabledSkills);
    for (const index of indexes) disabled.has(names[index]) ? disabled.delete(names[index]) : disabled.add(names[index]);
    config.disabledSkills = names.filter(name => disabled.has(name));
  }
  await savePreferences(config);
  const kept = names.filter(name => !config.disabledSkills.includes(name)).length;
  console.log(`\nSaved · ${kept} of ${names.length} enabled`);
}

export async function menuPrompt(config) {
  const prompt = createInterface({ input, output });
  try {
    while (true) {
      const detectedCount = (await Promise.all(harnesses(config).map(harnessIsInstalled))).filter(Boolean).length;
      const allSkills = await sourceSkillNames().catch(() => []);
      printHeader('AI setup', `${config.enabledHarnesses.length} enabled · ${detectedCount} found`);
      printOptions(menuItems(config, skillInfoFor(config, allSkills)));
      const rawChoice = await ask(prompt, 'Choose an option: ');
      if (rawChoice === null) return;
      const choice = rawChoice.trim();
      if (choice === '1') await install(config);
      else if (choice === '2') await verify(config);
      else if (choice === '3') {
        await chooseHarnesses(config, prompt);
      } else if (choice === '4') {
        await chooseSkills(config, prompt, allSkills);
      } else if (choice === '5') {
        config.runOnStartup = !config.runOnStartup;
        await savePreferences(config);
        await setAutostart(config.runOnStartup, config.autoFetch);
        console.log(`\nRun on startup: ${config.runOnStartup ? 'on' : 'off'}`);
      } else if (choice === '6') {
        config.autoFetch = !config.autoFetch;
        await savePreferences(config);
        await setAutostart(config.runOnStartup, config.autoFetch);
        console.log(`\nAuto background updates: ${config.autoFetch ? 'on' : 'off'}`);
      } else if (choice === '7') {
        config.installMissing = !config.installMissing;
        await savePreferences(config);
        console.log(`\nDon't skip missing harnesses: ${config.installMissing ? 'on' : 'off'}`);
      } else if (choice === '8' || choice === '') return;
      else console.log('Enter a number from 1 to 8.');
    }
  } finally { prompt.close(); }
}
