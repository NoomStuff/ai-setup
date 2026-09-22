# AI setup

One setup screen installs the instructions and skills in this repository across the coding agents you use.

## Open the setup

On Windows, double-click `setup.cmd`.

On macOS or Linux, open a terminal in this directory once and run:

```sh
chmod +x setup
./setup
```

No tui alternative:

```sh
./setup menu --no-tui
```

The setup needs Bun or Node.js 18 or newer.

## Settings

Startup and automatic fetching are off by default. Turn on `runOnStartup` to apply the setup when you sign in. Turn on `autoFetch` to also pull changes every 15 minutes. The watcher accepts fast-forward updates only. It will not pull over local changes or merge divergent branches.

Git hooks reapply the setup after you manually pull or rebase this repository.

## Supported apps

The menu supports Agent Skills, OpenAI Codex, Claude Code, Gemini CLI, GitHub Copilot CLI, Cursor, Windsurf, Cline, Roo Code, OpenCode, Google Antigravity, Kiro, Amp, Goose, and ZCode. It skips a harness when its existing install folder cannot be found.

## Repository layout

- `AGENTS.md` contains the shared instructions.
- `skills/` contains the skills.
- `config.json` contains your app and automation choices.
- `setup.cmd` and `setup` open the installer.
- `src/` contains the installer: `setup.mjs` dispatches commands, with `operations.mjs` doing the file work, `prompt.mjs` and `tui.mjs` holding the two menus, and `config.mjs`, `presets.mjs`, `ui.mjs`, `env.mjs` plus the fallback `default-config.json` beside them.

Existing files are backed up under `~/.ai-setup-backup` before replacement. State under `~/.ai-setup-state` records only paths owned by this repository, so disabling an app or deleting a skill does not remove unrelated files.

## Direct commands

The menu covers normal use. These commands are available for scripts:

```sh
./setup install
./setup verify
./setup list
./setup watch
```

On Windows, replace `./setup` with `setup.cmd`.
