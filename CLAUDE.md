# Project Conventions

## Comments and documentation — highest priority

- Comments describe what the code does, in plain technical language. Nothing else.
- Never write meta-commentary. Forbidden: notes about how a file was produced, instructions
  such as "change this and X will happen", design rationale essays, marketing phrasing,
  analogies, superlatives, emphasis quotes, emoji.
- Never cross-reference another file, document, spec, or numbered section from a comment
  ("see design/gdd/x.md", "per section 7.3", "defined in style.mjs"). State the behaviour
  itself. Comments describe the code they sit next to and nothing outside it.
- Never reference AI, assistants, prompts, generated patches, or tooling sessions anywhere in
  the repository, including commit messages, docs, and metadata.
- Never name third-party service providers in comments. Endpoints, keys, and model names live
  in code or environment variables, not in prose.
- Scripts under `tools/` are build-time utilities. Their comments cover usage and parameters only.
- Match the comment density of surrounding code. Do not annotate self-evident statements.
- Comments are written in Chinese. Identifiers, commit messages, and this file are in English.
- When editing, change the code directly. Do not leave notes about what was changed or why.

## Structure

- `src/engine/` — game rules, framework independent, no DOM access
- `src/ui/` — DOM rendering and input
- `src/fx/` — canvas particle and post-processing layer
- `src/audio/` — Web Audio synthesis
- `src/content/` — card, enemy, relic, and event definitions
- `assets/art/` — generated image assets, committed
- `assets/data/` — balance tables consumed by the engine
- `tools/` — asset pipeline scripts, not shipped in the build
- `design/gdd/` — design documents

## Engine rules

- The engine is pure: state in, new state out. No timers, no DOM, no randomness outside the
  seeded RNG passed through state.
- Card, relic, and enemy behaviour is declarative data plus small effect handlers. Avoid
  special-casing by identifier inside the reducer.
- Every rules change ships with a vitest case in `src/engine/__tests__/`.
