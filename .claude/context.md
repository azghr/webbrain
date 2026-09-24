# WebBrain Project Context

## What Is This Project?

WebBrain is an **open-source AI browser agent** — a browser extension for Chrome and Firefox that lets users chat with web pages, automate tasks, and run multi-step workflows using their choice of LLM (local or cloud).

The user types a natural-language instruction in a side panel, and an autonomous agent loop calls the LLM, executes tool calls (click, type, navigate, read page state, etc.), feeds results back to the LLM, and repeats until the task is done.

## Core Identity

- **Language**: Vanilla JavaScript (ES modules), no frameworks, no build step for the extension itself
- **License**: GPL-3.0-or-later (was MIT; change effective from 33.0.0. Releases before 33.0.0 remain MIT — see `LICENSES/MIT.txt`)
- **Version**: 36.8.0
- **Repository**: https://github.com/webbrain-one/webbrain.git
- **Website**: https://webbrain.one

## Architecture Overview

There are **two browser builds** that share almost all code but are duplicated so each is self-contained and can be loaded directly without a build step:

### Chrome Build (`src/chrome/`)

- **Manifest V3** — service worker background, `chrome.scripting`, `sidePanel` API
- CDP-backed trusted events (real `isTrusted=true` mouse/keyboard events)
- Offscreen document for fetch proxy and tab recording
- Shadow DOM piercing via CDP for closed roots
- Conversation persistence across service worker restarts via `chrome.storage.session`

### Firefox Build (`src/firefox/`)

- **Manifest V2** — background page, `browser.tabs.executeScript`, `sidebar_action`
- Synthetic events by default (`el.click()`, `new KeyboardEvent()`); optional `firefox-companion/` gives BiDi trusted input
- No offscreen document, no CDP, no closed shadow root support
- In-memory conversation only (no persistence across background restarts)

### Shared Components

- Agent loop, prompts, tools, adapters, providers, loop detection, context management
- Site adapters (138 sites)
- Provider system (local + cloud LLMs)
- Accessibility tree and ref-based interaction
- Trace recording (IndexedDB)

### MCP Server (`mcp-server/`)

- `@webbrain/mcp-server` (v0.1.0, TypeScript, MIT)
- Local stdio bridge letting any MCP client (Claude Code, Codex, Cursor, OpenClaw) drive the user's real authenticated browser via the running extension
- Client ↔ `webbrain-mcp` (stdio) ↔ `ws://127.0.0.1:17374/extension` ↔ WebBrain extension
- Chromium only (Firefox build has no offscreen document bridge)
- `src/`: `bridge.ts`, `config.ts`, `index.ts`, `runs.ts`; tests in `test/` (6 `.mjs` suites)

### Firefox Companion (`firefox-companion/`)

- Optional local companion providing **WebDriver BiDi trusted-automation** for Firefox (Node ≥22)
- Native-messaging host (`webbrain-bidi`) + `ws://localhost:9222`; only extension ID `webbrain@esokullu.com` may connect
- Gives Firefox CDP-like `isTrusted` input (coordinate clicks with post-validation, char-by-char trusted typing, native selects, sandboxed uploads via `input.setFiles`) without CDP
- Not required for standard Firefox operation; extra files: `host.mjs`, `install.mjs`, `session.mjs`

### Marketing Site (`web/`)

- Pure HTML/CSS, built from `web/build/template.html` + `web/build/locales/*.json`
- Multi-language (ar, bn, de, en, es, fa, fr, he, hi, id, ja, ko, ms, nl, pl, pt, ru, th, tl, tr, uk, vi, zh)
- Deployed via Vercel

### LM Studio Plugin (`lmstudio-plugin/`)

- TypeScript, standalone tool provider for LM Studio
- Ports `fetch_url` and `research_url` as pure Node tools (no browser dependency)

## Directory Structure

```
webbrain/
├── src/
│   ├── chrome/                    # Chrome MV3 extension
│   │   ├── manifest.json          # MV3 manifest
│   │   ├── skills/                # Packaged default skills (markdown)
│   │   ├── icons/                 # Extension icons
│   │   ├── styles/                # Extension CSS
│   │   ├── vendor/                # Third-party libs (pdfjs, turkish-deasciifier)
│   │   └── src/
│   │       ├── background.js      # Service worker (message router, agent lifecycle)
│       │   ├── agent/             # Agent loop, tools, adapters, skills, planner
│       │   │   ├── agent.js       # Main agent loop + executeTool()
│       │   │   ├── tools.js       # Tool schemas + system prompts
│       │   │   ├── planner.js     # Plan-before-Act JSON planner
│       │   │   ├── adapters.js    # Per-site guidance (138 adapters)
│       │   │   ├── skills.js      # Skill loading, catalog, tool exposure
│       │   │   ├── permission-gate.js  # Capability × origin gating
│       │   │   ├── credential-fields.js # Secret detection
│       │   │   ├── user-memory.js # Local preference memory
│       │   │   ├── loop-bucket.js # URL-family loop detection bucketing
│       │   │   ├── loop-detector.js # Extracted loop-detection helpers (repeat/coord/nav)
│       │   │   ├── scheduler.js   # Scheduled task management
│       │   │   ├── pdf-tools.js   # PDF text extraction
│       │   │   ├── pdf-extraction.js # PDF parsing
│       │   │   ├── pdf-ocr.js     # PDF OCR
│       │   │   ├── pdf-stream.js  # PDF streaming
│       │   │   ├── captcha-solver.js  # CapSolver integration
│       │   │   ├── captcha-gate.js # Frame-aware CAPTCHA detection/gate
│       │   │   ├── captcha-frame-runtime.js # CAPTCHA frame runtime helpers
│       │   │   ├── capsolver-config.js # CapSolver config
│       │   │   ├── screenshot-redaction.js # Privacy redaction
│       │   │   ├── sheets-tools.js # A1 range parsing, TSV roundtrip
│       │   │   ├── progress-ledger.js # Progress tracking
│       │   │   ├── progress-intent.js # Progress intent tracking
│       │   │   ├── json-extract.js # JSON extraction helpers
│       │   │   ├── text-sanitize.js # Text sanitization (canonical)
│       │   │   ├── image-budget.js # Auto-screenshot budget helpers
│       │   │   ├── read-page-window.js # read_page pagination windows
│       │   │   ├── tool-call-parser.js # Text tool-call parsing
│       │   │   ├── tool-arguments.js # Tool argument validation
│       │   │   ├── submit-click-guard.js # Rapid duplicate-submit guard
│       │   │   ├── mutation-tools.js # DOM mutation tools
│       │   │   ├── trace-export.js # Trace to Markdown export
│       │   │   ├── transcribe.js # Audio transcription
│       │   │   ├── cloud-output.js # Cloud run output handling
│       │   │   ├── runtime-context.js # Trusted runtime context
│       │   │   ├── workflows.js   # Workflow orchestration
│       │   │   ├── chat-workflow.js # Chat workflow handling
│       │   │   ├── adapter-workflow.js / adapter-workflow-evidence.js # Adapter workflow evidence
│       │   │   ├── completion-invariant.js # Completion invariant checks
│       │   │   ├── conversation-persistence.js # Conversation persistence
│       │   │   ├── message-recipient-guard.js # Recipient guard (Gmail/X/social)
│       │   │   ├── systemone-fast.js / systemone-judge.js / systemone-evidence.js # Jev system
│       │   │   ├── otp-email-tool.js / otp-* # OTP email mailbox reader
│       │   │   ├── research-escalation.js # Research escalation
│       │   │   ├── social-media-downloader.js # Social media content downloading
│       │   │   ├── social-publish-contract.js # Social publication contract
│       │   │   ├── public-media-url.js # Public media URL resolution
│       │   │   ├── offline-*.js    # Offline RAG, retrieval, semantic, reranker, stopwords
│       │   │   ├── zim-xapian.js / zim-xapian-runtime.js # Offline Xapian search
│       │   │   ├── apocalypse-mode.js / emergency-*.js # Apocalypse Mode + Emergency Box
│       │   │   ├── teacher-mode.js / rich-text-toolbar-guard.js / rich-text-toolbar-probe.js
│       │   │   ├── model-output-diagnostics.js # Model output analysis
│       │   │   ├── read-completeness.js # Read completeness tracking
│       │   │   ├── archive-opfs-writer-worker.js # OPFS archiving worker
│       │   │   └── observers/     # Site-specific observers (github, mastodon)
│       │   ├── providers/         # LLM provider abstraction
│       │   │   ├── base.js        # BaseLLMProvider
│       │   │   ├── manager.js     # ProviderManager (registry + config)
│       │   │   ├── provider-catalog.js # Provider catalog/registry
│       │   │   ├── openai.js      # OpenAI-compatible providers
│       │   │   ├── anthropic.js   # Anthropic Claude
│       │   │   ├── llamacpp.js    # llama.cpp local provider
│       │   │   ├── azure-openai.js # Azure OpenAI
│       │   │   ├── aws-bedrock.js # AWS Bedrock
│       │   │   ├── vertex-anthropic.js # Google Vertex AI via Anthropic
│       │   │   ├── context-windows.js # Context window detection/normalization
│       │   │   ├── provider-compatibility.js # Provider feature flags
│       │   │   ├── fetch-with-fallback.js # HTTP fetch with fallback
│       │   │   ├── oauth-claude.js # Claude OAuth flow
│       │   │   ├── oauth-subscriptions.js # OAuth subscription management
│       │   │   ├── deepseek.js / deepseek-config.js # Dedicated DeepSeek provider
│       │   │   ├── vision-capabilities.js # Vision support detection
│       │   │   └── connection-test-assets.js # Connection test fixtures
│   │       ├── content/           # Content scripts (injected into pages)
│   │       │   ├── accessibility-tree.js # AX tree builder + ref_ids
│   │       │   ├── content.js     # DOM reader, clicker, typer
│   │       │   ├── agent-visual-indicator.js # Pulsing border + Stop
│   │       │   ├── selection-shortcut.js # Selection handling
│   │       │   ├── redaction-regions.js # PII region collection
│   │       │   ├── file-picker-guard-page.js # File picker guard page
│   │       │   └── ollama-launch-handoff.js # Ollama launch handoff
│   │       ├── network/           # Network tools
│   │       │   └── network-tools.js # fetch_url, downloads, URL validation
│   │       ├── cdp/               # Chrome DevTools Protocol (Chrome only)
│   │       │   ├── cdp-client.js  # chrome.debugger wrapper
│   │       │   └── image-utils.js # Image processing
│   │       ├── offscreen/         # Offscreen document (Chrome only)
│   │       ├── recorder/          # Tab/screen recording orchestration
│   │       ├── trace/             # IndexedDB trace recorder
│   │       └── ui/                # Side panel UI
│   │           ├── sidepanel.html / sidepanel.js / sidepanel-window-scope.js
│   │           ├── settings.html / settings.js / settings-tabs.js
│   │           ├── traces.html / traces.js # Trace viewer
│   │           ├── history.html / history.js / history-text.js # Chat history
│   │           ├── i18n.js / locales/ # Internationalization (23 locales)
│   │           ├── markdown-render.js / markdown-link.js / skill-markdown.js
│   │           ├── theme.js / theme-bootstrap.js / ui-scale.js
│   │           ├── recommended-actions.js / store-review-prompt.js / run-error-dedupe.js
│   │           ├── context-menu-prompts.js / chat-history-store.js / tab-chat-persistence.js
│   │           ├── provider-icons.js / message-info.js
│   │           ├── attachment-drop.js / attachment-file.js / staged-screenshot-store.js
│   │           ├── selection-quote.js / watch-command.js / coupon-domains.js
│   │           ├── install.html / install.js / install.css / install-assets/
│   │           ├── mic-permission.html / mic-permission.js
│   │           ├── pdf-handler.html/js/css # PDF viewer
│   │           ├── wikipedia-*.js/html/css # Wikipedia reader/library
│   │           ├── apocalypse-*.js/html/css # Apocalypse Mode UI
│   │           ├── emergency-*.js/html/css # Emergency Box/comm/PDF/text UI
│   │           ├── offline-rag-readiness.js/css # Offline RAG readiness UI
│   │           ├── safesocial-settings.js # SafeSocial settings
│   │           ├── download-tracker.js/css # Download tracker
│   │           └── utils.js        # Shared UI utilities (escapeHtml, etc.)
│       │   ├── cloud-runs.js      # Cloud run persistence
│       │   ├── run-capture.js     # Run capture (screenshots/recordings)
│       │   ├── run-ui-journal.js  # UI journal for runs
│       │   ├── context-menu-storage.js # Context menu storage (claim/ownership races)
│       │   ├── profile-sync.js    # Profile synchronization
│       │   ├── run-reconnect.js   # Run reconnect helpers
│       │   ├── config-transfer.js # Settings/config transfer
│       │   ├── chrome-protected-pages.js # Chrome restricted-page handling
│       │   ├── chrome-web-store-release.js # Web Store release automation
│       │   ├── download-directory.js # Download directory helpers
│       │   ├── download-result.js # Download result tracking
│       │   ├── error-format.js    # Error formatting
│       │   ├── tab-group-preference.js # Tab group preferences
│       │   ├── selection-shortcut-i18n.js # Selection shortcut i18n
│       │   └── ollama-handoff.js  # Ollama launch handoff
│       │
│       └── firefox/                   # Firefox MV2 extension (mirrors Chrome structure)
│           ├── manifest.json          # MV2 manifest
│           ├── skills/                # Packaged default skills (same as Chrome)
│           ├── icons/                 # Extension icons
│           ├── styles/                # Extension CSS
│           ├── vendor/                # Third-party libs (same as Chrome)
│           └── src/                   # Same structure as Chrome, minus cdp/, offscreen/, recorder/
│                                        # Firefox-exclusive: bidi/ (bind.js, client.js),
│                                        #   background.html, firefox-restricted-domains.js,
│                                        #   shortcut-command.js, watch-alert.js, smd-loader.js,
│                                        #   content/file-picker-guard-loader.js
│
├── web/                           # Marketing site
│   ├── index.html                 # Generated landing page
│   ├── privacy.html               # Privacy policy
│   ├── vercel.json                # Vercel config
│   ├── build/                     # Build system
│   │   ├── build.mjs              # Site generator (pure Node ESM)
│   │   ├── template.html          # HTML template with {{t:key}} markers
│   │   ├── locales/               # Locale JSON files
│   │   └── plausible.mjs          # Analytics partial
│   ├── assets/                    # Site images
│   ├── blog/                      # Blog content
│   ├── docs/                      # Documentation site
│   └── {locale}/                  # Generated locale pages (es, fr, zh, etc.)
│
├── lmstudio-plugin/               # LM Studio plugin (TypeScript)
│   ├── package.json               # @webbrain/lmstudio-web-tools
│   ├── tsconfig.json              # TypeScript config
│   ├── src/                       # Plugin source
│   └── dist/                      # Compiled output
│
├── mcp-server/                    # MCP server (TypeScript, `@webbrain/mcp-server`)
│   ├── package.json               # stdio bridge → extension via ws://127.0.0.1:17374
│   ├── tsconfig.json
│   ├── src/                       # bridge.ts, config.ts, index.ts, runs.ts
│   └── test/                      # 6 .mjs test suites
│
├── firefox-companion/             # Firefox WebDriver BiDi trusted-automation companion
│   ├── README.md                  # Node 22+, native messaging + ws://localhost:9222
│   ├── host.mjs                   # webbrain-bidi native-messaging host
│   ├── install.mjs                # Companion installer
│   └── session.mjs                # BiDi session logic
│
├── LICENSES/                      # Historical license texts (MIT.txt for pre-33.0.0)
│
├── test/                          # Tests (pure Node, no framework)
│   ├── run.js                     # Main test runner (loads Chrome + Firefox modules)
│   ├── README.md                  # Test documentation
│   ├── security/                  # Security/injection tests
│   ├── fixtures/                  # Fixture-based tests
│   ├── anonymous/                 # Anonymous usage tests
│   ├── llm/                       # LLM scenario tests
│   ├── memory/                    # User memory tests
│   ├── smd-tests/                 # Social media downloader tests
│   ├── jev/                       # Jev classifier tests
│   ├── llm-tiny/ + llm-tiny-v2/   # Small-model test suites
│   ├── vision/ + vision-results/  # Vision probe tests
│   ├── systemone*.mjs             # Jev fast-classifier tests
│   ├── safesocial*.mjs            # SafeSocial classifier tests
│   ├── firefox-bidi*.mjs          # Firefox BiDi companion tests
│   ├── social-publish-contract*.mjs # Social publication contract tests
│   ├── pdf-read.mjs / pdf-selection.mjs / pdf-mime-handler-e2e.mjs # PDF tests
│   ├── provider-model-limits.mjs  # Provider model limits
│   ├── attachment-drop.mjs / build-unpacked.mjs / rich-text-toolbar-guard.mjs
│   ├── browser-dialogs*.mjs / agent-lifecycle.mjs / runtime-lifecycle.mjs
│   ├── webmcp-e2e.mjs            # WebMCP end-to-end test
│   ├── vision-probe.mjs          # Vision probe test
│   ├── manual-permissions.md      # Manual permissions testing guide
│   └── manual-screenshot-redaction.md # Manual screenshot redaction testing guide
│
├── ci/                            # CI/CD pipeline
│   ├── run.mjs                    # CI runner
│   ├── test.mjs                   # CI test runner
│   ├── README.md                  # CI documentation
│   ├── cloud-capture.test.mjs     # Cloud capture tests
│   ├── lib/                       # CI shared libraries
│   │   ├── webbrain-client.mjs    # WebBrain client
│   │   ├── grader.mjs             # Test grader
│   │   └── suite.mjs              # Test suite
│   └── catalog/                   # Test catalogs
│       └── scenarios.json         # Scenario definitions
│
├── scripts/                       # Build/dev scripts
│   ├── build-blog.mjs             # Blog builder
│   ├── build-docs.mjs             # Docs builder
│   ├── build-zip.mjs              # Release zip builder
│   ├── build-zim-xapian.mjs       # ZIM/Xapian index builder
│   ├── build-unpacked.mjs         # Unpacked build helper
│   ├── bump-version.mjs           # Version bumper
│   ├── update-changelog.mjs       # Changelog updater
│   ├── update-coupon-domains.mjs  # Coupon domain list updater
│   ├── trace-to-otlp.mjs          # Trace → OTLP exporter
│   ├── preview-web.mjs            # Web preview server
│   ├── i18n-perm-translations.mjs # i18n permission translations
│   ├── gen-store-promos.py        # Store promo generator
│   └── sync-logo-assets.py        # Logo sync
│
├── docs/                          # Documentation
│   ├── architecture.md            # System architecture
│   ├── adding-a-tool.md           # New tool checklist
│   ├── accessibility-tree-and-refs.md # AX refs and page reads
│   ├── site-adapters.md           # Adapter guide
│   ├── providers-and-models.md    # Provider config
│   ├── localization.md            # i18n workflow
│   ├── privacy-and-data-flow.md   # Data handling
│   ├── security-model.md          # Permissions and risk
│   ├── prompt-injection-defense.md # Injection defense
│   ├── THREAT-MODEL.md            # Threat model
│   ├── test-scenarios.md          # Test scenarios
│   ├── claude-chrome-comparison.md # Comparison with Claude Chrome
│   ├── agent-tools.md / skills.md / slash-commands.md # Tooling references
│   ├── offline-rag.md / offline-rag-licensing.md / offline-rag-release-checklist.md
│   ├── apocalypse-mode.md / remote-downloads.md / community.md / discord-setup.md
│   ├── export-and-workflow-formats.md / social-publication-contract.md
│   ├── selection-context-verification.md / trace-format-compatibility.md
│   ├── accessibility-tree-benchmark.md / browser-agent-interface-findings.md
│   ├── vision-models/             # Vision model docs
│   └── zh-CN/                     # Chinese documentation
│   └── fr/                        # French documentation
│
├── assets/                        # Logo and promo assets
├── dist/                          # Built release zips
├── package.json                   # Root package.json
├── AGENT.md                       # Agent guidelines (MUST READ)
├── README.md                      # Project README
├── README.es.md                   # Spanish README
├── README.fr.md                   # French README
├── README.zh-CN.md                # Chinese README
├── CHANGELOG.md                   # Version history
├── CONTRIBUTING.md                # Contribution guide
├── CODE_OF_CONDUCT.md             # Code of conduct
├── GOVERNANCE.md                  # Project governance
├── LICENSE                        # GPL-3.0-or-later
├── LICENSES/                      # Historical licenses (MIT.txt for pre-33.0.0)
├── SECURITY.md                    # Security policy
├── TODOs.md                       # Feature backlog
└── .gitattributes                 # Git attributes
```

## Conversation Modes

WebBrain separates **model tier** from **conversation mode**:

### Tiers (`compact | mid | full`)

Control how many normal browser-agent tools a model sees:

- **Compact**: Reduced tool set + shorter system prompt for smaller local models
- **Mid**: Common task tools, iframe support, downloads, scheduling, form verification
- **Full**: Advanced browser-operation tools (hover, drag-drop, frames, shadow DOM)

### Modes (`ask | act | dev`)

Control what kind of task the user is allowing:

- **Ask**: Read-only. Agent can read, analyze, summarize but never click, type, or navigate
- **Act**: Exposes the selected tier's normal browser-agent tools
- **Dev**: Requires Mid/Full provider. Adds source/style/debug tools, page inspection, execute_js

## Agent Tools

Key tools organized by category (full list ~80 tools in `src/chrome/src/agent/tools.js`):

### Read-only (Ask + all modes)

- `get_accessibility_tree` — AX tree with ref_ids (preferred reader; auto-slices with continuation metadata, returns structured `pageGate` on rendered login/registration/paywall surfaces, Gmail `conversationRootRefId` support)
- `read_page` — Prose fallback for long-form articles; windowed with `continuationArgs`/`accessState`/`pageGate`
- `read_pdf` — PDF text extraction (pdfjs-dist; `hasExtractableText` flag; paginate with fromPage/toPage)
- `get_window_info` — Page metadata
- `get_interactive_elements` — Interactive elements
- `scroll` — Scroll the page (pane-aware via ref_id/x-y)
- `extract_data` — Structured data extraction
- `get_selection` — Selected text
- `fetch_url` — HTTP requests
- `research_url` — Extract readable article body
- `delegate_research` — Escalate to a research specialist runs
- `find_text` — Locate text on the page
- `gmail_count_results` — Gmail result counts
- `list_webmcp_tools` / `execute_webmcp_tool` — WebMCP tool discovery/execution
- `done` — Complete the task

### Action (Compact+)

- `click` / `click_ax` — Click elements
- `type_text` / `type_ax` / `set_field` / `set_checked` — Form interaction
- `press_keys` — Keyboard shortcuts
- `navigate` / `new_tab` / `list_tabs` / `activate_tab` — Navigation and tabs
- `carousel_navigate` — Carousel stepping
- `wait_for_element` / `wait_for_stable` — Wait conditions
- `scratchpad_write` — Write to scratchpad
- `progress_update` / `progress_read` — Progress tracking
- `chat_observe` / `chat_send` — Chat workflow observation + send
- `clarify` — Pause and ask the user (mid-call)
- `beep` — Audible notification
- `upload_file` — File uploads

### Advanced (Mid+)

- `go_back` / `go_forward` — Browser history
- `download_files` / `list_downloads` / `read_downloaded_file` / `download_resource_from_page` — Downloads
- `download_social_media` — Social media content download
- `schedule_task` / `schedule_resume` — Scheduled tasks
- `iframe_read` / `iframe_click` / `iframe_type` / `promote_iframe` — iframe interaction
- `solve_captcha` — CAPTCHA solving
- `verify_form` — Form verification
- `resize_window` / `inspect_viewport` — Window/viewport control

### Full-tier

- `hover` — Mouse hover (CDP-trusted)
- `drag_drop` — Drag and drop
- `get_shadow_dom` / `shadow_dom_query` — Shadow DOM access
- `get_frames` — Frame enumeration

### Dev-only

- `read_page_source` — View page source
- `inspect_element_styles` — Inspect CSS
- `execute_js` — Run JavaScript
- `inject_css` / `remove_injected_css` — Reversible CSS
- `patch_element` / `revert_patch` — Reversible DOM edits
- `highlight_element` — Visual overlay
- `read_console` — Console logs
- `inspect_network_requests` — Network requests
- `inspect_event_listeners` — Event listeners

## Provider System

All providers extend `BaseLLMProvider` and normalize to:

```js
{ content: string, toolCalls: Array|null, usage: Object|null }
```

### Local Providers (no API key needed)

- **llama.cpp** (port 8080)
- **Ollama** (port 11434/v1)
- **LM Studio** (port 1234/v1)
- **Jan** (port 1337/v1)
- **vLLM** (port 8000/v1)
- **SGLang** (port 30000/v1)
- **LocalAI** (port 8080/v1)
- **GPT4All** (local OpenAI-compatible)
- **WebGPU** — in-browser LLM inference (Compass Tiny v2.1, MiniCPM5-2B, LFM2.5, Bonsai 27B, Nanbeige4.2-3B presets); Chrome-only

### Cloud Providers (API key required)

- **WebBrain Compass** — Managed cloud (default; formerly "WebBrain Cloud 1.0", renamed 2026-09-01)
- **OpenAI** — GPT-5.6, etc.
- **Anthropic Claude** — Native API
- **Google Gemini**, **Mistral AI**, **DeepSeek** (dedicated provider), **xAI Grok**, **Groq**
- **MiniMax**, **Alibaba Cloud (Qwen)**
- **Cloudflare Workers AI**, **Nvidia NIM**
- **OpenRouter** — 100+ models (default: `openrouter/free`) + routing variants
- **Azure OpenAI**, **AWS Bedrock**
- **Unsloth Studio** (added 2026-08-25), **Pollinations AI** (2026-09-09), **NEAR AI Cloud** (2026-09-17)
- Plus **76 additional provider cards** in `provider-catalog.js` (104 built-in cards total, pre-filled base URLs and defaults — see `docs/providers-and-models.md`) — now with configurable model limits

## Skills System

Skills are optional prompt guidance + tool extensions:

- Stored in `chrome.storage.local` / `browser.storage.local`
- Packaged defaults ship in `src/{chrome,firefox}/skills/`
- Current defaults (12): FreeSkillz.xyz, OTP helper, Disposable email (Mail.tm), Open-Meteo weather, Open Library, Litterbox, Frankfurter FX, Wikipedia, Humanizer, Phonr calls, Turkish deasciifier, Chrome Web Store release
- Skills can expose HTTP tools via `webbrain-tools` manifest
- Skills are loaded per-run based on user intent (routed by planner or model)
- Agent Skills trust boundary enforced (structural plain scalars rejected, frontmatter validated)

## Site Adapters

138 site-specific adapters inject guidance into the first user message:

- Only ONE adapter fires at a time (first match)
- Adapters inject selectors, URL patterns, visible text, traps, success indicators
- 29+ added since 2026-08: India bundle (Swiggy, IRCTC, Paytm, Snapdeal), CIS/MENA (Wildberries, Avito, VK, Noon), LATAM (OLX, Despegar), East Asia/RU (Mercari, Yahoo JP, Naver, Yandex Market), Africa/MENA (Jumia, Kilimall, Careem, Talabat), EU/SEA (Bol, Otto, Willhaben, Tokopedia), baidu-tieba expansion
- Site adapters are high-leverage product work (short, concrete notes)

## Key Subsystems

### Plan before Act

- Optional action-mode planning gate
- Runs before first browser tool call
- Returns structured JSON with summary, steps, skill_ids, risks
- User approves/rejects before execution

### Loop Detection

Three independent detectors:

1. **General repeat** — Last 6 tool calls by (name + args hash + outcome)
2. **Coordinate click** — 5px-bucketed clicks
3. **Navigation** — URL snapshot before/after actions

### Context Management

- **Auto-compaction** — Summarizes older turns when nearing context window
- **Emergency trim** — Keeps only last 6 messages on overflow
- **Image pruning** — Strips base64 images from all but last 4 messages
- **Tool result cap** — 8KB per result

### User Memory

- Local, user-stated durable preferences
- Stored in `wb_user_memory_v1`
- Injected into system prompt as bounded block
- Optional auto-learning (off by default)

### Scheduling

- Deferred work using browser `alarms` API
- Job kinds: `resume` (continue conversation) and `task` (standalone prompt)
- Supports one-shot and recurring schedules
- Jobs persist in `chrome.storage.local`

### Offline RAG + Xapian (Apocalypse Mode)

- Offline-first question answering over locally-synced corpora (Wikipedia etc.)
- Semantic runtime, retrieval + reranker, query stopwords, ZIM/Xapian index (`scripts/build-zim-xapian.mjs`)
- Apocalypse Mode + Emergency Box UIs; teacher mode; OPFS archiving worker
- `docs/offline-rag.md` for details

### Jev Fast-Classifier System (systemone)

- Uses small/fast classifiers ("safe-stop", "systemone") to decide when an agent run should stop/pause before expensive slow-path inference
- TypeSafe scheduler judge → Assistive Models; fast-flow screenshot handoffs + event-driven wakeups
- `test/systemone*.mjs` suites (Some require Playwright browsers)

### Social Recipient Guard

- Pre-send recipient verification for Gmail/X/social DM composition
- X group DM recipient binding, message-history delivery proofs; generic-first guard on any site
- User-granted send authorization, fail-open guard, silent-reply recovery
- `message-recipient-guard.js` + site adapters

### PDF Tooling

- `read_pdf` agent tool (pdfjs-dist, per-page extraction, vision fallback note)
- PDF extraction/OCR/stream modules; PDF viewer + Wikipedia reader UI in the sidepanel

## Security Model

- MV3 manifest permissions: `sidePanel`, `activeTab`, `contextMenus`, `tabs`, `tabGroups`, `scripting`, `storage`, `notifications`, `webNavigation`, `webRequest`, `debugger`, `downloads`, `alarms`, `unlimitedStorage`, `offscreen`, `privateNetworkAccess`, `tabCapture`, `clipboardWrite/Read` + `<all_urls>`
- Ask is read-only; Act/Dev are action modes
- Plan before Act can require human approval
- `/allow-api` flag gates destructive HTTP methods
- Tool results capped at 8KB to limit injection surface
- `strictSecretMode` prevents credential quoting
- Trace data is local-only (IndexedDB)
- Untrusted content wrapped with `_wrapUntrusted` boundaries
- Screenshot redaction + URL redaction hardening for PII
- Social recipient guard: pre-send verification for Gmail/X/social DMs

## Build System

### Extension

**No build step** — load directly from `src/chrome/` or `src/firefox/`

`npm run build:chrome|build:firefox|build:all` — optional `scripts/build-unpacked.mjs` packaging

### Marketing Site

```bash
npm run build:web        # Build landing page + blog + docs
npm run build:web:landing # Build landing page only
npm run build:blog        # Build blog only
npm run build:docs        # Build docs only
npm run preview:web       # Preview site
```

### Release

```bash
npm run build:zip         # Build release zip
npm run bump              # Bump version
npm run release           # Bump + release
```

## Testing

- `npm test` — Full suite (systemone, firefox-bidi, lifecycle, provider-limits, benchmark, toolbar-guard, pdf, social, safesocial, build-unpacked, attachment-drop, `test/run.js`, selection-scope, security); several suites need Playwright browsers (`npx playwright install`)
- `node test/run.js` — Core regression suite (pure Node, no framework, no chrome.\* APIs) — **2396 tests**
- `npm run test:security` — Security/injection tests
- `npm run test:injection-bench` — Prompt injection benchmarks
- `npm run test:safety-report` — Safety report
- `npm run test:fixtures` — Fixture tests
- `npm run test:anonymous` — Anonymous usage tests
- `npm run test:systemone[:fast|:ui]` — Jev classifier suite (+ DOM/UI variants)
- `npm run test:safesocial[:ui|:extension]` — SafeSocial suite
- `npm run test:firefox-bidi` / `:e2e` — Firefox BiDi companion tests
- `npm run test:social-contract[:dom]` — Social publication contract tests
- `npm run test:provider-limits` — Provider model limits
- `npm run test:pdf-read` / `test:pdf-selection` — PDF tooling tests
- `npm run test:attachment-drop` — Drag-and-drop attachment tests
- `npm run test:vision` / `test:webmcp` — Vision / WebMCP tests
- `node --check <file>` — Syntax-only JS check on touched files

Tests import Chrome and Firefox modules directly (no browser needed) and verify:

- Tool classifications and parity
- Provider config and compatibility
- Adapter matching
- Loop detection
- Permission gating
- Skills catalog and loading
- Markdown rendering
- Version bumping
- Changelog management
- And more

## Code Conventions

- **No frameworks** — Vanilla JS/CSS unless very strong reason
- **No build step for extension** — Direct load for development
- **Mirror changes** — Changes should be mirrored across Chrome and Firefox unless platform makes parity impossible
- **Keep tool schemas narrow** — Stable tool names, arguments, result shapes
- **Comments explain why** — Browser quirks, prompt rules, permission gates, context choices
- **Adapter notes imperative** — Name selectors, visible text, URL patterns, traps, success indicators
- **No broad dependencies** — Extension is intentionally simple to load and inspect

## Key Files to Read First

1. `AGENT.md` — Agent guidelines and goals
2. `docs/architecture.md` — System overview
3. `docs/adding-a-tool.md` — New tool checklist
4. `docs/site-adapters.md` — Adapter guide
5. `docs/providers-and-models.md` — Provider config
6. `docs/prompt-injection-defense.md` — Injection defense
7. `docs/security-model.md` — Permissions and risk
8. `docs/offline-rag.md` — Offline RAG/Apocalypse Mode
9. `docs/skills.md` / `docs/slash-commands.md` — Skills and slash commands
10. `src/chrome/src/agent/tools.js` — Tool definitions
11. `src/chrome/src/agent/agent.js` — Agent loop
12. `src/chrome/src/providers/manager.js` — Provider registry

## Current Status (as of 2026-09-22)

### Test Suite

- **2395 passed, 1 failed** (2396 total) via `node test/run.js`
- Failing test:
  1. `version 33-and-later licensing boundary is consistent across project metadata and FAQ copy` — **active regression**: commit `0b37aab73` (2026-09-21) removed the "releases before 33.0.0 remain MIT" paragraph from `LICENSE` that this test greps for. Fix either test or LICENSE/FAQ copy.
- Note: `npm test` runs additional Playwright suites (`test:systemone`, etc.) that need `npx playwright install` — environment, not code.

### Code Health

- **0 syntax errors** across key files (verified via `node --check`)
- **0 TODO/FIXME/HACK/BUG comments** in source `.js` files
- **11 engineering TODOs** tracked in `TODOs.md` (3 resolved, several partially resolved, rest open)
- Full issues report: `.claude/issues-report.md`

### Recent Changes

- **Licensing**: MIT → GPL-3.0-or-later effective 33.0.0; `LICENSES/MIT.txt` retains historical MIT text; README (incl. fr/zh-CN) license statements synced (commit `0b37aab73`)
- **Recipient guard / social-messaging hardening** (~30 commits, dominant theme): X group DM recipient binding, message-history delivery proofs, LinkedIn post composer allowance + localized controls, generic-first recipient guard on any site, fail-open guard + user-granted send authorization, silent-reply recovery, screenshot budget, shadow-host `aria-hidden` traversal fix in `_hasVisibleBox`
- **SafeSocial**: Instagram classifier + settings export (Chrome+Firefox), opt-in Jev classifiers with guarded browser decisions — v36.8.0
- **Jev fast-classifier system** (systemone): TypeSafe scheduler judge moved to Assistive Models, fast-flow screenshot handoffs, event-driven wakeups, malformed-response/reconciliation fixes
- **MCP server** (`mcp-server/`): stdio bridge so Claude Code/Codex/Cursor/OpenClaw can drive the running extension (`ws://127.0.0.1:17374`); made browser-optional and Chromium-focused
- **Firefox BiDi companion** (`firefox-companion/`): WebDriver BiDi native-messaging host giving Firefox trusted `isTrusted` input (clicks, typing, selects, uploads)
- **Providers**: dedicated DeepSeek provider; Unsloth Studio, Pollinations AI, NEAR AI Cloud added; WebGPU provider restored (Compass Tiny v2.1, MiniCPM5-2B, LFM2.5, Bonsai 27B, Nanbeige4.2-3B presets); managed default renamed WebBrain Cloud 1.0 → **WebBrain Compass**; configurable model limits
- **Offline RAG + Xapian**: offline retrieval/semantic/reranker/runtime, ZIM/Xapian index builder (`scripts/build-zim-xapian.mjs`, `zim-xapian.js`, `zim-xapian-runtime.js`), offline stopword handling
- **PDF viewer + OCR**: `pdf-extraction.js`, `pdf-ocr.js`, `pdf-stream.js`, PDF read/selection test suites, OPFS archiver worker
- **Theme/content**: Apocalypse Mode + Emergency Box, teacher mode, rich-text toolbar guard/probe, OTP skill-gated mailbox reader (`otp-email-tool.js`), drag-and-drop attachments, localized tool-action labels, URL redaction hardening
- **Site adapters**: +29 since 2026-08 → **138 total** (India, CIS/MENA, LATAM, East Asia/RU, Africa/MENA, EU/SEA bundles, baidu-tieba expansion)
- **Skills**: Humanizer and Phonr calls added to packaged defaults (now 12)
- Releases: v33.0.0 (2026-08-20) … v35.0.0, v36.0.0 (2026-09-09) … **v36.8.0 (2026-09-20)**, current dev version 36.8.0

### Known Firefox Parity Gaps

- `upload_file` — available in Firefox (user-picker resolve path)
- `full_page_screenshot` — retired as an agent tool in both builds (`RETIRED_AGENT_TOOL_NAMES`); `/screenshot --full-page` unsupported in Firefox (no scroll-and-stitch fallback)
- `get_shadow_dom` — dispatched in Firefox with open roots only ("Closed shadow roots are not accessible in Firefox" per tool schema); `shadow_dom_query` — **not implemented** in Firefox (no tool def, no content dispatch); still referenced in dead sets (`COMPLETION_DOCUMENT_OBSERVATION_TOOLS`, `WORKFLOW_CONTENT_READ_TOOLS`). `firefox-companion/` BiDi layer mitigates other CDP gaps.

### Chrome/Firefox Source Drift (verified 2026-09-22)

- **Chrome-only agent files:** `offline-answer-copy.js`, `offline-retrieval-offscreen.js`, `pdf-extraction.js`, `transcribe.js` (Chrome agent dir 80 files vs Firefox 77)
- **Firefox-only agent files:** `smd-loader.js`
- **Chrome-only infra:** `cdp/`, `offscreen/*`, `cloud-runs.js`, `recorder/host.js`, `providers/webgpu.js`
- **Firefox-only:** `bidi/` (bind.js, client.js), `background.html`, `firefox-restricted-domains.js`, `shortcut-command.js`, `watch-alert.js`, `content/file-picker-guard-loader.js`
- **Size drift:** `agent.js` Chrome 44,081 vs Firefox 36,714 (+20%), `content.js` Chrome 8,345 vs Firefox 7,291, `oauth-claude.js` Chrome +35%

### Prompt System TODO

- Compact-vs-full prompt contradiction is **partially resolved** (compact routing is per-provider opt-in); remaining work is prompt quality / model-tier selection
- Proposed: three-tier system (frontier/mid/small) instead of binary
- See `TODOs.md` item #1 for detailed analysis
