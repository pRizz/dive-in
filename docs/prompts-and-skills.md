# Prompts and Skills Guide

Deep Dive now provides two reusable instruction formats from the **Prompts** tab:

- **Prompt**: quick copy/paste text for one-time AI use.
- **Skill**: reusable structured instructions for repeated workflows.

## Skill Formats

- **Codex (`SKILL.md`)**
  - Designed for Codex-style skill libraries.
  - Includes sections: Purpose, When to use, Required inputs, Steps, Constraints, Expected output.
- **Generic (`.md`)**
  - Works in any AI chat/tool that accepts markdown instructions.
  - Includes sections: Context, Objective, Inputs, Instructions, Constraints, Response format.

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

## Request New Prompts or Skills

Have an idea for a new optimization prompt or skill?

Open an issue: [GitHub Issues](https://github.com/pRizz/deep-dive/issues)
