# Deep Dive Generated Codex Skills

> Generated file: run `just build-skills` to refresh. Commit changes in this directory when skill sources or generation logic change.

## One-command global install
```bash
curl -fsSL "https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/install-all.sh" | bash
```
Review before running if desired:
```bash
curl -fsSL "https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/install-all.sh" -o /tmp/deep-dive-skills-install-all.sh
bash /tmp/deep-dive-skills-install-all.sh
```

## Use in Codex
1. In Codex, type `/`.
2. Select the relevant installed `deep-dive-*` skill from the picker.
3. Submit your request.

## Official Codex Skills docs
- Overview: `https://developers.openai.com/codex/skills`
- Create a skill: `https://developers.openai.com/codex/skills#create-a-skill`
- Install skills: `https://developers.openai.com/codex/skills#install-skills`

## Install destinations
- User-global (default installer target): `~/.codex/skills/<slug>/SKILL.md`
- Project-local: `<repo>/.codex/skills/<slug>/SKILL.md`
- Override installer target with `DEEP_DIVE_SKILLS_INSTALL_ROOT=/custom/path`

## Raw URL template
- `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/<slug>/SKILL.md`

## Example manual install command (user-global)
```bash
mkdir -p ~/.codex/skills/deep-dive-optimize-layer-caching
curl -fsSL "https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-optimize-layer-caching/SKILL.md" -o ~/.codex/skills/deep-dive-optimize-layer-caching/SKILL.md
```

## Available skills

| Slug | Repo path | Raw URL |
|---|---|---|
| `deep-dive-optimize-layer-caching` | `.codex/skills/deep-dive-optimize-layer-caching/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-optimize-layer-caching/SKILL.md` |
| `deep-dive-slim-base-image` | `.codex/skills/deep-dive-slim-base-image/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-slim-base-image/SKILL.md` |
| `deep-dive-multi-stage-refactor` | `.codex/skills/deep-dive-multi-stage-refactor/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-multi-stage-refactor/SKILL.md` |
| `deep-dive-remove-build-artifacts` | `.codex/skills/deep-dive-remove-build-artifacts/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-remove-build-artifacts/SKILL.md` |
| `deep-dive-tune-dockerignore` | `.codex/skills/deep-dive-tune-dockerignore/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-tune-dockerignore/SKILL.md` |
| `deep-dive-speed-up-deps` | `.codex/skills/deep-dive-speed-up-deps/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-speed-up-deps/SKILL.md` |
| `deep-dive-harden-runtime-image` | `.codex/skills/deep-dive-harden-runtime-image/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-harden-runtime-image/SKILL.md` |
| `deep-dive-security-and-size-balance` | `.codex/skills/deep-dive-security-and-size-balance/SKILL.md` | `https://raw.githubusercontent.com/pRizz/deep-dive/main/.codex/skills/deep-dive-security-and-size-balance/SKILL.md` |
