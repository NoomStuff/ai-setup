# AI setup

Personal instructions and skills shared by Codex, ZCode, and Claude Code.

## Layout

- `AGENTS.md` contains shared global instructions.
- `skills/` contains personal skills. Each directory must contain `SKILL.md`.
- `install.ps1` copies global instructions and creates skill junctions for each supported agent.
- `verify.ps1` checks every managed link.

The installer creates these files and links:

| Consumer | Instructions copy | Skill junctions |
| --- | --- | --- |
| Shared agents | n/a | `~/.agents/skills/<name>` |
| Codex | `~/.codex/AGENTS.md` | `~/.codex/skills/<name>` |
| ZCode | `~/.zcode/AGENTS.md` | `~/.zcode/skills/<name>` |
| Claude Code | `~/.claude/CLAUDE.md` | `~/.claude/skills/<name>` |

All supported agents read the same skill files from this repository. Windows does not allow cross-drive file hard links, and file symbolic links require Developer Mode or administrator rights. The installer therefore copies the instruction file; rerun it after editing `AGENTS.md`.

## Install

Clone the repository, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
.\verify.ps1
```

The installer is safe to run again. Before replacing an ordinary file or directory, it copies the old content to a timestamped directory under `~/.ai-setup-backup`. It removes stale junctions previously managed by this repository, but leaves unrelated skills alone. It also preserves Codex's bundled `.system` skills.

Skill directories use junctions and normally require neither Developer Mode nor administrator rights.

Restart Codex or Claude Code after changing global instructions. In ZCode, start a new task after changing `AGENTS.md`. Refresh the relevant Skills page after adding a skill.

## Adding a skill

Create `skills/<name>/SKILL.md`, commit it, and run `install.ps1` on each computer. Keep the YAML `name` equal to the directory name and keep `description` precise enough for automatic selection. Run `install.ps1` again after editing `AGENTS.md`.

Do not commit credentials, API keys, model-provider configuration, telemetry state, logs, or session history here.
