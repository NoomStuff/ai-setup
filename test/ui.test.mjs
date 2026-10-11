import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { supportsUnicode } from '../src/ui.mjs';

test('native Windows consoles use Unicode without terminal markers', () => {
  assert.equal(supportsUnicode({}, 'win32', true), true);
  assert.equal(supportsUnicode({ TERM: 'dumb' }, 'win32', true), true);
  assert.equal(supportsUnicode({}, 'win32', false), false);
});

test('Windows UTF-8 output works without a native console handle', () => {
  for (const name of ['LANG', 'LC_CTYPE', 'LC_ALL']) {
    for (const locale of ['C.UTF-8', 'en_US.utf8']) {
      assert.equal(supportsUnicode({ [name]: locale }, 'win32', false), true);
    }
  }
  assert.equal(supportsUnicode({ LC_ALL: 'C', LANG: 'en_US.UTF-8' }, 'win32', false), false);
  assert.equal(supportsUnicode({ LC_CTYPE: 'C', LANG: 'en_US.UTF-8' }, 'win32', false), false);
  assert.equal(supportsUnicode({ LC_ALL: '', LANG: 'C.UTF-8', TERM: 'dumb' }, 'win32', false), true);
});

test('Windows terminal markers work without a native console handle', () => {
  for (const name of ['CI', 'WT_SESSION', 'VSCODE_INJECTION', 'WINDOWS_TERMINAL',
    'TERMINUS_SUBLIME', 'ConEmuTask', 'HYPER']) {
    assert.equal(supportsUnicode({ [name]: '1' }, 'win32', false), true);
  }
  for (const program of ['vscode', 'WezTerm', 'Hyper', 'Alacritty']) {
    assert.equal(supportsUnicode({ TERM_PROGRAM: program }, 'win32', false), true);
  }
  for (const term of ['xterm', 'xterm-color', 'xterm-256color', 'alacritty', 'wezterm']) {
    assert.equal(supportsUnicode({ TERM: term }, 'win32', false), true);
  }
  assert.equal(supportsUnicode({ ConEmuANSI: 'ON' }, 'win32', false), true);
  assert.equal(supportsUnicode({ ConEmuANSI: 'OFF' }, 'win32', false), false);
});

test('explicit overrides retain priority over automatic detection', () => {
  assert.equal(supportsUnicode({ NO_UNICODE: '1', LANG: 'C.UTF-8' }, 'win32', true), false);
  assert.equal(supportsUnicode({ FORCE_UNICODE: '1' }, 'win32', false), true);
  assert.equal(supportsUnicode({ FORCE_UNICODE: '1', NO_UNICODE: '1' }, 'win32', false), true);
  assert.equal(supportsUnicode({ FORCE_UNICODE: '1', TERM: 'linux' }, 'linux', false), true);
});

test('Unix terminals retain Unicode and the Linux console retains ASCII', () => {
  assert.equal(supportsUnicode({}, 'darwin', false), true);
  assert.equal(supportsUnicode({ TERM: 'xterm-256color' }, 'linux', true), true);
  assert.equal(supportsUnicode({ TERM: 'linux', LANG: 'C.UTF-8' }, 'linux', true), false);
  assert.equal(supportsUnicode({ NO_UNICODE: '1' }, 'darwin', true), false);
});

test('renderers output actual Unicode symbols or ASCII according to detection', () => {
  const script = String.raw`
    import { printHeader } from './src/ui.mjs';
    import { verifyResultLines } from './src/tui.mjs';
    printHeader('Symbols');
    console.log(verifyResultLines({ checked: [], skipped: [{ name: 'Example' }] }).join('\n'));
  `;
  for (const disabled of [false, true]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: new URL('../', import.meta.url),
      env: { LANG: 'C.UTF-8', ...(disabled ? { NO_UNICODE: '1' } : {}) },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    if (disabled) {
      assert.match(result.stdout, /-{44}/);
      assert.match(result.stdout, /v 0 match/);
      assert.match(result.stdout, /- 1 skipped/);
      assert.doesNotMatch(result.stdout, /[─✓–]/);
    } else {
      assert.match(result.stdout, /─{44}/);
      assert.match(result.stdout, /✓ 0 match/);
      assert.match(result.stdout, /– 1 skipped/);
    }
  }
});
