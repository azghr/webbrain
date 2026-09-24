# WebBrain Setup & Run Flow

## Prerequisites

- **Node.js** >= 18 (for tests, scripts, web build, lmstudio-plugin)
- **Chrome** or **Firefox** browser
- **LLM access** (one of):
  - Local: llama.cpp, Ollama, LM Studio, Jan, vLLM, SGLang, LocalAI, or GPT4All
  - Cloud: API key for OpenAI, Anthropic, Google, OpenRouter, etc.
  - Or use WebBrain Compass (managed cloud, no setup needed — the default provider)

---

## 1. Clone the Repository

```bash
git clone https://github.com/webbrain-one/webbrain.git
cd webbrain
```

## 2. Install Dependencies

```bash
npm install
```

This installs `playwright` (dev dependency for tests). The extension itself has zero dependencies.

For the LM Studio plugin (optional):

```bash
cd lmstudio-plugin
npm install
cd ..
```

---

## 3. Load the Extension

### Chrome (Recommended)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `src/chrome` folder from the cloned repo
5. The WebBrain icon appears in the toolbar

### Firefox

1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to `src/firefox/` and select `manifest.json`
4. The WebBrain icon appears in the toolbar

> Note: Firefox temporary add-ons are removed on restart. For permanent installation, the extension needs signing via addons.mozilla.org.

---

## 4. Set Up an LLM Provider

### Option A: WebBrain Cloud (No Setup)

- Default provider, no API key needed
- Works immediately after loading the extension

### Option B: Local Model

Start your local LLM server:

```bash
# llama.cpp
llama-server -m your-model.gguf --port 8080

# Ollama
ollama serve
# Then in WebBrain settings, set base URL to http://localhost:11434/v1

# LM Studio
# Start LM Studio's local API server (default port 1234)

# Jan
# Start Jan's local API server (default port 1337)

# GPT4All
# Start GPT4All's local server (OpenAI-compatible)

# vLLM
vllm serve your-model --port 8000

# SGLang
python -m sglang.launch_server --model-path your-model --port 30000
```

Then in WebBrain settings:

1. Click the gear icon (or extension Options page)
2. Select your provider (llama.cpp, Ollama, etc.)
3. The base URL is pre-filled for known providers
4. Click **Test Connection** to verify

> Context window: Use a model with at least 16k tokens for reliable agent runs. 8k works with Compact mode. 4k is too small.

### Option C: Cloud Provider

1. Click the gear icon in WebBrain
2. Select your provider (OpenAI, Anthropic, etc.)
3. Enter your API key
4. Select a model
5. Click **Test Connection**

---

## 5. Use WebBrain

1. Click the WebBrain icon → the side panel opens
2. Type a message like:
   - "Summarize this page"
   - "Find all links about pricing"
   - "Fill in the search box with 'AI agents' and click Search"
   - "Navigate to github.com and find trending repositories"

### Conversation Modes

- **Ask** (default) — Read-only, safe by default
- **Act** — Browser actions (click, type, navigate)
- **Dev** — Page debugging and HTML/CSS inspection

### Slash Commands

Type `/` in the input to see available commands:

- `/help` — Show all commands
- `/ask` — Switch to Ask mode
- `/act` — Switch to Act mode
- `/dev` — Switch to Dev mode
- `/compact` — Force context compaction
- `/reset` — Clear conversation
- `/memory` — Manage user memory
- `/export` — Download conversation

### Keyboard Shortcuts

- `Ctrl+/` or `Cmd+/` — Focus input
- `Ctrl+Shift+A` or `Cmd+Shift+A` — Ask mode
- `Ctrl+Shift+X` or `Cmd+Shift+X` — Act mode
- `Ctrl+Shift+D` or `Cmd+Shift+D` — Dev mode
- `Escape` — Stop active run

---

## 6. Run Tests

```bash
# Main regression suite (pure Node, no browser needed)
npm test

# Security/injection tests
npm run test:security

# Prompt injection benchmarks
npm run test:injection-bench

# Safety report
npm run test:safety-report

# Fixture tests
npm run test:fixtures

# Anonymous usage tests
npm run test:anonymous

# Syntax-only check on a specific file
node --check src/chrome/src/agent/agent.js
```

The test runner (`test/run.js`) imports Chrome and Firefox modules directly under Node (no chrome.\* APIs needed for most tests) and verifies parity between browsers.

---

## 7. Build the Marketing Site

After editing files in `web/`:

```bash
# Build everything (landing page + blog + docs)
npm run build:web

# Build landing page only
npm run build:web:landing

# Build blog only
npm run build:blog

# Build docs only
npm run build:docs
```

The site generator reads `web/build/template.html` + `web/build/locales/*.json` and writes generated HTML files. **Do not hand-edit** `web/index.html` or `web/*/index.html` directly — the next build will overwrite them.

---

## 8. Build the LM Studio Plugin (Optional)

```bash
cd lmstudio-plugin
npm install
npm run build    # Compiles TypeScript to dist/
npm run dev      # Watch mode
cd ..
```

---

## 9. Release Process

```bash
# Bump version in package.json, manifest.json, etc.
npm run bump

# Build release zip for Chrome Web Store
npm run build:zip

# Bump + release
npm run release
```

---

## 10. Development Workflow

### Making Changes

1. Edit files in `src/chrome/` or `src/firefox/`
2. Mirror changes across browsers unless platform makes parity impossible
3. Reload the extension in the browser:
   - Chrome: `chrome://extensions/` → click refresh icon on WebBrain card
   - Firefox: `about:debugging` → click "Reload"
4. Test manually in the browser

### Adding a New Tool

1. Read `docs/adding-a-tool.md` for the checklist
2. Add tool schema in `src/*/src/agent/tools.js`
3. Add implementation in `src/*/src/agent/agent.js` or content script
4. Mirror across Chrome and Firefox
5. Add tests in `test/run.js`
6. Run `npm test` to verify

### Adding a New Provider

1. Create a new class extending `BaseLLMProvider` in `src/*/src/providers/`
2. Implement `chat()` and optionally `chatStream()`
3. Register it in `src/*/src/providers/manager.js`
4. Mirror across Chrome and Firefox

### Adding a Site Adapter

1. Read `docs/site-adapters.md` for the guide
2. Add adapter in `src/*/src/agent/adapters.js`
3. Test on the target site

---

## Quick Reference

| Task                   | Command                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| Load Chrome extension  | `chrome://extensions/` → Load unpacked → `src/chrome`                   |
| Load Firefox extension | `about:debugging` → Load Temporary Add-on → `src/firefox/manifest.json` |
| Run tests              | `npm test`                                                              |
| Build web              | `npm run build:web`                                                     |
| Build LM Studio plugin | `cd lmstudio-plugin && npm run build`                                   |
| Build release zip      | `npm run build:zip`                                                     |
| Bump version           | `npm run bump`                                                          |
| Syntax check           | `node --check <file>`                                                   |

---

## Troubleshooting

### Extension won't load

- Ensure Developer mode is enabled (Chrome)
- Check browser console for errors
- Verify you selected the correct folder (`src/chrome` or `src/firefox`)

### Local model not connecting

- Ensure the local server is running
- Check the port matches (default ports listed above)
- Click "Test Connection" in WebBrain settings
- Verify CORS settings if using Firefox (local providers need CORS headers)

### Tests failing

- Ensure Node.js >= 18 is installed
- Run `npm install` first
- Check if the failing test is browser-specific (Chrome-only or Firefox-only)

### Web build not working

- Ensure you edited files in `web/build/` (not `web/index.html` directly)
- Run `npm run build:web` after changes
- Check `web/build/locales/*.json` for translation issues
