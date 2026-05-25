# Kilo Code Cerebras Kimi K2.6 Branch

This branch adds first-class support for `moonshotai-kimi-k2.6` in Kilo Code's built-in Cerebras provider.

What this branch changes:
- adds `moonshotai-kimi-k2.6` to the Cerebras model list
- preserves `<think>...</think>` history replay for K2.6 only
- forwards streamed `reasoning` and `reasoning_content` deltas from Cerebras into Kilo's reasoning stream

## Use The Correct Repo And Branch

Intended fork: `https://github.com/ryanl-cerebras/kilocode`

Intended branch: `codex/cerebras-kimi-k2.6`

After cloning, verify all of this before doing anything else:

```bash
git remote get-url origin
git branch --show-current
rg -n "moonshotai-kimi-k2.6" packages/types/src/providers/cerebras.ts src/api/providers/cerebras.ts
```

Expected:
- `origin` points at `ryanl-cerebras/kilocode`
- current branch is `codex/cerebras-kimi-k2.6`
- the grep output shows the K2.6 model entry and Cerebras provider handling

If any of those checks fail, stop. You are on the wrong repo or branch.

## Publish The Fork And Branch

If the fork does not exist yet, create it with:

```bash
gh repo fork Kilo-Org/kilocode --org ryanl-cerebras --clone=false --remote=false
```

Then push this branch to the fork:

```bash
git remote add ryanl-cerebras https://github.com/ryanl-cerebras/kilocode.git
git push -u ryanl-cerebras codex/cerebras-kimi-k2.6
```

## Prerequisites

- Node `20.19.2`
- `pnpm`
- `git-lfs`
- `code` on `PATH` if you want to install the VSIX from the shell
- `SA_API_KEY` exported in your shell

Setup:

```bash
git lfs install
git lfs pull
pnpm install
```

## Quick Regression Check

Run the provider regression test first:

```bash
pnpm --dir src exec vitest run api/providers/__tests__/cerebras.spec.ts
```

Expected result:
- `18 passed`

This validates the K2.6 model entry, preserved `<think>` replay, and streamed reasoning handling.

## Recommended Test Path: Build And Install The VSIX

Build the extension:

```bash
pnpm build
```

This should produce a VSIX under `bin/`, for example:

```bash
ls -1v bin/kilo-code-*.vsix | tail -n1
```

Install the newest VSIX:

```bash
code --install-extension "$(ls -1v bin/kilo-code-*.vsix | tail -n1)" --force
```

## How To Test In Kilo Code

Inside the installed Kilo Code extension:

1. Open Kilo Code settings or provider configuration.
2. Select provider `cerebras`.
3. Set the Cerebras API key to the value of `SA_API_KEY`.
4. Set the model to `moonshotai-kimi-k2.6`.
5. Start with this prompt:

```text
Reply exactly K2.6_OK
```

Then run a second test that exercises multi-turn reasoning reuse. Example:

Turn 1:

```text
Think step by step about 37 * 43. Give only the final answer.
```

Turn 2:

```text
Without recomputing from scratch, explain which intermediate product you used.
```

The important behavior is that K2.6 should keep working across turns instead of losing preserved thinking history for this model.

## Scriptable CLI Path

Use this if you want a shell-only test path.

Create an empty `.env` file first so the CLI build always has one to copy into `dist/`:

```bash
touch cli/.env
```

Build the CLI bundle:

```bash
pnpm cli:bundle
```

Run the CLI with env-only configuration:

```bash
mkdir -p .kilo-home .kilo-empty
HOME="$(pwd)/.kilo-home" \
KILO_PROVIDER_TYPE=cerebras \
KILO_API_KEY="$SA_API_KEY" \
KILO_CEREBRAS_API_KEY="$SA_API_KEY" \
KILO_API_MODEL_ID=moonshotai-kimi-k2.6 \
KILO_TELEMETRY=false \
KILO_EPHEMERAL_MODE=true \
node cli/dist/index.js -w "$(pwd)/.kilo-empty" -m ask --auto --json -t 60 "Reply exactly K2.6_OK"
```

Notes about the CLI path:
- set both `KILO_API_KEY` and `KILO_CEREBRAS_API_KEY`
- `KILO_API_KEY` is currently required by the CLI env validator even though the actual provider field is `cerebrasApiKey`
- the empty workspace keeps the smoke test focused on the model path instead of a real repo

## Known Caveats

- This branch only preserves raw `<think>` replay for `moonshotai-kimi-k2.6`. Other Cerebras models still strip prior thinking traces.
- The CLI env validation currently expects `KILO_API_KEY` for `cerebras`. That is why the CLI example sets both `KILO_API_KEY` and `KILO_CEREBRAS_API_KEY`.
- If `pnpm cli:bundle` fails because the machine cannot reach public package registries, the VSIX path is still the primary recommended way to test.
- If the CLI reports `Could not find ripgrep binary`, the local CLI bundle is incomplete. Re-run `pnpm cli:bundle` on a normal internet-connected machine.

## Files Changed In This Branch

- `packages/types/src/providers/cerebras.ts`
- `src/api/providers/cerebras.ts`
- `src/api/providers/__tests__/cerebras.spec.ts`
