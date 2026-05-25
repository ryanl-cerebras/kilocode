# Kilo Code Cerebras Kimi K2.6 Branch

This branch adds first-class support for `moonshotai-kimi-k2.6` in Kilo Code's built-in Cerebras provider before that model is available upstream.

What this branch changes:
- adds `moonshotai-kimi-k2.6` to the Cerebras model list
- preserves `<think>...</think>` history replay for K2.6 only
- forwards streamed `reasoning` and `reasoning_content` deltas from Cerebras into Kilo's reasoning stream

## Prerequisites

Get a Cerebras API key at [cloud.cerebras.ai](https://cloud.cerebras.ai), then export it in your shell:

```bash
# Get a key at https://cloud.cerebras.ai, then:
export CEREBRAS_API_KEY="csk-..."
```

Install the required tools before cloning the repo.

macOS:

```bash
brew update
brew install git git-lfs ripgrep nvm

# If you prefer fnm instead of nvm:
# brew install fnm

# If you prefer n instead of nvm:
# brew install n

# If VS Code is not installed yet:
# brew install --cask visual-studio-code

export NVM_DIR="$HOME/.nvm"
. "$(brew --prefix nvm)/nvm.sh"
nvm install 20.19.2
nvm use 20.19.2

# fnm alternative:
# eval "$(fnm env)"
# fnm install 20.19.2
# fnm use 20.19.2

# n alternative:
# sudo n 20.19.2

npm install -g pnpm@10.8.1
# or:
# corepack enable
# corepack prepare pnpm@10.8.1 --activate

git lfs install
```

Linux (Debian or Ubuntu):

```bash
sudo apt update
sudo apt install -y git git-lfs ripgrep curl build-essential

# If VS Code is not installed yet and snap is available:
# sudo snap install code --classic

curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 20.19.2
nvm use 20.19.2

# fnm alternative:
# curl -fsSL https://fnm.vercel.app/install | bash
# eval "$(fnm env)"
# fnm install 20.19.2
# fnm use 20.19.2

# n alternative:
# sudo npm install -g n
# sudo n 20.19.2

npm install -g pnpm@10.8.1
# or:
# corepack enable
# corepack prepare pnpm@10.8.1 --activate

git lfs install
```

You also need Visual Studio Code with the `code` CLI on your `PATH`.

- On macOS, open VS Code, press `Cmd+Shift+P`, run `Shell Command: Install 'code' command in PATH`, then restart your terminal.
- On Linux, the `code` command is usually already on `PATH` if VS Code was installed from the official package or Snap package.

Verify your toolchain before continuing:

```bash
node --version
pnpm --version
git lfs version
rg --version
code --version
```

Expected versions:
- Node.js: `v20.19.2`
- pnpm: `10.8.1`

## Use The Correct Repo And Branch

Clone the fork, not upstream, and check out the branch that contains the provider changes:

```bash
git clone https://github.com/ryanl-cerebras/kilocode.git
cd kilocode
git checkout codex/cerebras-kimi-k2.6
```

After cloning, verify that you are on the expected repo and branch before doing anything else:

```bash
git remote get-url origin
git branch --show-current
rg -n "moonshotai-kimi-k2.6" packages/types/src/providers/cerebras.ts src/api/providers/cerebras.ts
```

Expected:
- `origin` points to `https://github.com/ryanl-cerebras/kilocode.git`
- current branch is `codex/cerebras-kimi-k2.6`
- the search output shows the K2.6 model entry and Cerebras provider handling

If any of those checks fail, stop. You are on the wrong repo or branch.

<details>
<summary>Maintainer-only: publishing the fork</summary>

If you are maintaining this branch and need to publish it to your own fork:

```bash
gh repo fork Kilo-Org/kilocode --clone=false --remote=false
git remote add ryanl-cerebras https://github.com/ryanl-cerebras/kilocode.git
git push -u ryanl-cerebras codex/cerebras-kimi-k2.6
```

If the `ryanl-cerebras` remote already exists, run:

```bash
git remote set-url ryanl-cerebras https://github.com/ryanl-cerebras/kilocode.git
git push -u ryanl-cerebras codex/cerebras-kimi-k2.6
```

</details>

## Install Dependencies And Build

From the repo root:

```bash
git lfs install
git lfs pull
pnpm install
pnpm build
```

This should produce a VSIX under `bin/`, for example `bin/kilo-code-4.126.1.vsix`.

## Quick Regression Check

Run the provider regression test before trying the UI or CLI paths:

```bash
pnpm --dir src exec vitest run api/providers/__tests__/cerebras.spec.ts
```

Expected result:
- the test run passes

This validates the K2.6 model entry, preserved `<think>` replay, and streamed reasoning handling.

## Recommended Test Path: Build And Install The VSIX

Install the newest VSIX into VS Code:

```bash
code --install-extension "$(ls -1v bin/kilo-code-*.vsix | tail -n1)" --force
```

Then open any writable test folder in VS Code and use the Kilo Code panel.

## How To Test In Kilo Code

1. Open any writable folder in VS Code.
2. Open the Kilo Code panel.
3. Open provider settings and choose:
   - Provider: `Cerebras`
   - API key: your `CEREBRAS_API_KEY`
   - Model: `moonshotai-kimi-k2.6`
4. Start with this prompt:

```text
Reply exactly K2.6_OK
```

5. Then run a second test that exercises multi-turn reasoning reuse.

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

This smoke test runs a single-turn request against Cerebras and prints streamed JSON output. It confirms that the provider wiring works, but it does not validate the multi-turn regression fix.

Create an empty `.env` file first so the CLI build always has one to copy into `dist/`, then build the CLI bundle:

```bash
touch cli/.env
pnpm cli:bundle
```

Run the single-turn smoke test:

```bash
mkdir -p .kilo-home .kilo-empty
HOME="$(pwd)/.kilo-home" \
KILO_PROVIDER_TYPE=cerebras \
KILO_API_KEY="$CEREBRAS_API_KEY" \
KILO_CEREBRAS_API_KEY="$CEREBRAS_API_KEY" \
KILO_API_MODEL_ID=moonshotai-kimi-k2.6 \
KILO_TELEMETRY=false \
KILO_EPHEMERAL_MODE=true \
node cli/dist/index.js -w "$(pwd)/.kilo-empty" -m ask --auto --json -t 60 "Reply exactly K2.6_OK"
```

Expected result:
- streamed JSON output appears in the terminal
- the assistant response includes `K2.6_OK`

Confirm that K2.6 is actually serving the request:
- look for `"apiProtocol":"openai"` in the streamed JSON output
- look for a non-zero `tokensIn` value in the streamed JSON output
- optionally confirm the request in your Cerebras dashboard logs

Launch the interactive CLI session:

```bash
mkdir -p ~/kilo-scratch
HOME="$(pwd)/.kilo-home" \
KILO_PROVIDER_TYPE=cerebras \
KILO_API_KEY="$CEREBRAS_API_KEY" \
KILO_CEREBRAS_API_KEY="$CEREBRAS_API_KEY" \
KILO_API_MODEL_ID=moonshotai-kimi-k2.6 \
KILO_TELEMETRY=false \
KILO_EPHEMERAL_MODE=true \
node cli/dist/index.js -w ~/kilo-scratch -m code
```

CLI mode options:
- `-m code`
- `-m ask`
- `-m architect`
- `-m debug`
- `-m orchestrator`

Exit the CLI with `Ctrl+C`.

## Multi-Turn Validation Note

The multi-turn behavior is the regression this branch fixes. Validating it requires the VSIX path in VS Code because that interactive flow exercises follow-up turns and preserved `<think>` replay. The CLI smoke test only confirms that the Cerebras provider wiring works for K2.6.

## Known Caveats

- This branch only preserves raw `<think>` replay for `moonshotai-kimi-k2.6`. Other Cerebras models still strip prior thinking traces.
- The CLI env validation currently expects `KILO_API_KEY` for `cerebras`. That is why the CLI examples set both `KILO_API_KEY` and `KILO_CEREBRAS_API_KEY`.
- If `pnpm install` fails, re-check that your Node version is exactly `20.19.2`.
- If `pnpm cli:bundle` fails because the machine cannot reach public package registries, use the VSIX path first.
- If the CLI reports `Could not find ripgrep binary`, re-run `pnpm cli:bundle` on a normal internet-connected machine.
- If the `code` command is missing, install the VS Code shell command and restart your terminal.

## Files Changed In This Branch

- `packages/types/src/providers/cerebras.ts`
- `src/api/providers/cerebras.ts`
- `src/api/providers/__tests__/cerebras.spec.ts`
