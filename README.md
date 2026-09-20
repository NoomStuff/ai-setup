# AI setup

Personal instructions and skills shared by Codex and ZCode.

## Layout

- `AGENTS.md` contains global instructions for both agents.
- `skills/` contains personal skills. Each directory must contain `SKILL.md`.
- `install.ps1` copies global instructions and creates skill junctions for Codex and ZCode.
- `verify.ps1` checks every managed link.

The installer creates these files and links:

| Consumer | Instructions copy | Skill junctions |
| --- | --- | --- |
| Codex | `~/.codex/AGENTS.md` | `~/.agents/skills/<name>` |
| ZCode | `~/.zcode/AGENTS.md` | `~/.zcode/skills/<name>` |

Codex and ZCode read the same skill files from this repository. Windows does not allow cross-drive file hard links, and file symbolic links require Developer Mode or administrator rights. The installer therefore copies `AGENTS.md`; rerun it after editing that file.

## Install

Clone the repository, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
.\verify.ps1
```

The installer is safe to run again. Before replacing an ordinary file or directory, it copies the old content to a timestamped directory under `~/.ai-setup-backup`. It never changes Codex's bundled `.system` skills or ZCode's unrelated skills.

Skill directories use junctions and normally require neither Developer Mode nor administrator rights.

Restart Codex after changing global instructions. In ZCode, start a new task after changing `AGENTS.md`; refresh the Skills page after adding a skill.

## Adding a skill

Create `skills/<name>/SKILL.md`, commit it, and run `install.ps1` on each computer. Keep the YAML `name` equal to the directory name and keep `description` precise enough for automatic selection. Run `install.ps1` again after editing `AGENTS.md`.

Do not commit credentials, API keys, model-provider configuration, telemetry state, logs, or session history here.
