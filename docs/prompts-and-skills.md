# Prompts and Skills Guide

Deep Dive now provides two reusable instruction formats from the **Prompts** tab:

- **Prompt**: quick copy/paste text for one-time AI use.
- **Skill**: reusable structured instructions for repeated workflows.

## Skill Formats

- **Codex (`SKILL.md`)**
  - Designed for Codex-style skill libraries.
  - Includes YAML frontmatter (`name`, `description`) plus sections: Use this when, How to use, Required inputs, Steps, Constraints, Expected output.
- **Generic (`.md`)**
  - Works in any AI chat/tool that accepts markdown instructions.
  - Includes sections: Context, Objective, Inputs, Instructions, Constraints, Response format.

## Official Codex Docs

- Overview: https://developers.openai.com/codex/skills
- Create a skill: https://developers.openai.com/codex/skills#create-a-skill
- Install skills: https://developers.openai.com/codex/skills#install-skills

## Single Skill Workflow

1. Open **Prompts** tab.
2. Choose a card.
3. Click **Copy skill** for default Codex format.
4. Open **View details** to switch between Codex and Generic formats and copy the exact version you want.

## Batch Workflow (Export All)

1. In **Prompts**, click **Export all skills**.
2. Select format: **Codex**, **Generic**, or **Both**.
3. Download the zip bundle.
4. Use files from:
   - `deep-dive-skills/codex/<slug>/SKILL.md`
   - `deep-dive-skills/generic/<slug>.md`

The bundle also includes:

- `deep-dive-skills/README.md`
- `deep-dive-skills/manifest.json`

## Repo-Local Generated Codex Skills

Deep Dive also generates repo-tracked Codex skills from prompt card JSON data:

- Output path: `.codex/skills/deep-dive-*/SKILL.md`
- Generate manually: `just build-skills`
- Also generated automatically by: `just build`, `just check`, and `just dev`
- Generated index + raw install links: `.codex/skills/README.md`
- Each generated skill has a public raw URL suitable for install scripts

When prompt data or skill generator logic changes, updates to generated `.codex/skills` files are expected and should be committed.

### Global install script (generated)

The generated skills index includes a one-command installer script:

```bash
curl -fsSL "https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/install-all.sh" | bash
```

- Default global install destination: `~/.codex/skills`
- Override destination if needed: `DEEP_DIVE_SKILLS_INSTALL_ROOT=/custom/path ...`
- The script is idempotent and prints per-skill status plus a final summary.

#### Use in Codex

1. In Codex, type `/`.
2. Select the relevant installed `deep-dive-*` skill from the picker.
3. Submit your request.

### After download

#### Import into Codex

1. Unzip the bundle.
2. Copy folders from `deep-dive-skills/codex/<slug>/SKILL.md` into either `~/.agents/skills/<slug>/SKILL.md` (user-global, recommended) or `<repo>/.codex/skills/<slug>/SKILL.md` (project-local), preserving `<slug>/SKILL.md`.
3. Restart Codex.

#### Use in Other AI Apps/CLIs

1. Use files from `deep-dive-skills/generic/*.md`.
2. Paste into the system/developer/custom-instructions area of your target AI app or CLI.
3. Optionally keep these files as reusable prompt library snippets.

## Request New Prompts or Skills

Have an idea for a new optimization prompt or skill?

Open an issue: [GitHub Issues](https://github.com/pRizz/deep-dive/issues)
