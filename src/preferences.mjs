import { savePreferences } from './config.mjs';
import { setAutostart } from './operations.mjs';
import { startWatcher, stopWatcher } from './watcher.mjs';

export async function toggleAutoFetch(config) {
  const previous = config.autoFetch;
  config.autoFetch = !previous;
  try {
    await savePreferences(config);
    await setAutostart(config.runOnStartup, config.autoFetch);
    if (config.autoFetch) await startWatcher();
    else await stopWatcher();
  } catch (error) {
    config.autoFetch = previous;
    await savePreferences(config);
    await setAutostart(config.runOnStartup, config.autoFetch);
    if (!previous) await stopWatcher();
    throw error;
  }
}
