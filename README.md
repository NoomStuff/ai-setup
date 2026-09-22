# AI setup

One setup screen installs the instructions and skills in this repository across the coding agents you use.

## Open the setup

On Windows, double-click `setup.cmd`.

On macOS or Linux, open a terminal in this directory once and run:

```sh
chmod +x setup
./setup
```

Both launch the same menu:

```text
AI setup
4 enabled · 4 found
────────────────────────────────────────────
  1  Install or update            Copy instructions and skills
  2  Choose apps                  4 enabled
  3  Verify                       Check installed copies
  4  Run on startup               off
  5  Fetch updates automatically  off
  6  Exit
```

The setup needs Bun or Node.js 18 or newer. It prefers Bun when both are installed.

## Settings

Startup and automatic fetching are off by default. Turn on `runOnStartup` to apply the setup when you sign in. Turn on `autoFetch` to also pull changes every 15 minutes. The watcher accepts fast-forward updates only. It will not pull over local changes or merge divergent branches.

Git hooks reapply the setup after you manually pull or rebase this repository.

The ignored root [config.json](config.json) contains all user settings:

```json
{
  "enabledHarnesses": ["codex", "copilot", "opencode", "zcode"],
  "runOnStartup": false,
  "autoFetch": false
}
```

The setup creates this file on first open and the menu updates it afterward. Built-in fallback values live in `src/default-config.json`, so pulling changes never overwrites personal choices.

## Supported apps

The menu supports Agent Skills, OpenAI Codex, Claude Code, Gemini CLI, GitHub Copilot CLI, Cursor, Windsurf, Cline, Roo Code, OpenCode, Google Antigravity, Kiro, Amp, Goose, and ZCode. It skips an app when its existing install folder cannot be found. It never creates a new app root merely because the preset exists.

Codex receives `~/.codex/AGENTS.md` and `~/.codex/skills`. Copilot receives `~/.copilot/copilot-instructions.md` and `~/.copilot/skills`, which are the personal locations documented by GitHub.

## Repository layout

- `AGENTS.md` contains the shared instructions.
- `skills/` contains the skills.
- `config.json` contains your app and automation choices.
- `setup.cmd` and `setup` open the installer.
- `src/` contains the installer and its fallback config.

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
