# ChatGPT Style for Gemini

A lightweight, Manifest V3 Chromium extension that restyles [`https://gemini.google.com/*`](https://gemini.google.com/) with the calm typography, reading rhythm, code block clarity, and light/dark surface polish of ChatGPT—while keeping Gemini's core features, interactive controls, math rendering, and icon fonts intact.

---

## Features

- **ChatGPT Native Typography**: Uses native system sans-serif and monospace font stacks with zero external network font requests.
- **Three Typography Presets**:
  - **ChatGPT Native Stack** (`ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif`)
  - **Clean Sans** (`"Inter", ui-sans-serif, ...`)
  - **Editorial Serif** (serif prose paired with clean sans-serif UI controls)
- **Live Reading Rhythm Controls**: Adjust base chat font size (`13px–20px`) and line spacing (`1.45–1.95`) in real time.
- **Three Surface Polish Levels**:
  - **Subtle** — Pure typography, line spacing, and reading measure.
  - **Balanced** — Adds ChatGPT-inspired light/dark canvas, sidebar, user-bubble, composer, and code block surfaces.
  - **Crisp** — Deeper contrast and sharper border framing.
- **Icon & Math Safe**: Explicitly excludes `mat-icon`, `google-symbols`, Material symbol classes, `[class*="icon"]`, `svg`, `.katex`, and `mjx-container` from prose font overrides.
- **Ultra-Lightweight**: Runs at `document_start` to prevent FOUC and drives all styling through CSS custom properties (`--cgf-*`) on `<html>`. Uses attribute-only (`subtree: false`) theme observation so token streaming causes zero DOM-observer overhead.

---

## Project Structure

```text
gemini2chatgpt/
├── manifest.json             # Manifest V3 extension config
├── content.js                # Lightweight settings & theme attribute syncer
├── popup.html                # Compact 344px popup UI
├── popup.css                 # Light/dark popup styling
├── popup.js                  # Live storage & tab message controller
├── styles/
│   └── chatgpt-theme.css     # Scoped ChatGPT typography & surface stylesheet
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## How to Load Unpacked in Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** and select this project folder (`gemini2chatgpt`).
4. Pin **ChatGPT Style for Gemini** from the Extensions toolbar menu if desired.

---

## Testing on Gemini

1. Navigate to `https://gemini.google.com/` and open any conversation (or start a new prompt).
2. Click the **ChatGPT Style for Gemini** toolbar icon to open the popup.
3. Verify:
   - Toggling the master switch immediately enables/disables all styling with no page reload.
   - Switching between **ChatGPT Native Stack**, **Clean Sans**, and **Editorial Serif** updates chat messages while keeping all sidebar, toolbar, and copy icons intact.
   - Adjusting **Font Size**, **Line Spacing**, and **Surface Polish** updates live during both idle and streaming responses.
   - Toggling Gemini between Light and Dark themes automatically updates surface and code block contrast.

---

## Customizing Font Stacks or Colors

- **Font Stacks**: Edit `FONT_PRESETS` and `MONO_STACK` near the top of `content.js` (and the matching preview classes in `popup.css` if you change presets).
- **Colors & Spacing**: Edit the `--cgf-*` CSS custom properties at the top of `styles/chatgpt-theme.css` under `:root[data-cgf-enabled="true"]` (light) and `:root[data-cgf-enabled="true"][data-cgf-theme="dark"]` (dark).
- **Reading Width**: Adjust `--cgf-measure` (default `48rem`) in `styles/chatgpt-theme.css`.
