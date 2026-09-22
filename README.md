# AI setup

Personal instructions and skills shared by all providers.

## Layout

- `AGENTS.md` contains shared global instructions.
- `skills/` contains personal skills. Each directory must contain `SKILL.md`.
- `install.ps1` copies global instructions and creates skill junctions for each supported agent.
- `verify.ps1` checks every managed link.

The installer creates these files and links:

| Consumer | Instructions copy | Skill junctions |
| --- | --- | --- |
| Shared agents | - | `~/.agents/skills/<name>` |
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

This clones your AGENTS.md and skills into their respective folders

## Adding a skill

Make changes to your skills or `AGENTS.md`. Keep the YAML `name` equal to the directory name and keep `description` precise enough for automatic selection.

 `install.ps1` updates the files across your harnesses and will have to manually ran again after each change.
