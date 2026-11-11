# The Flame Tool

The Flame Tool is an AI problem solver for high-school schoolwork — math, science, English, history, and similar. Click **Analyze** (or use the Mac hotkey), capture the screen, and get **only the final answer(s)**. No steps. No explanation. Multiple questions on screen come back as a numbered list of final answers. Multiple choice is letter + choice text only.

Default AI provider is **Google Gemini’s free tier** (`gemini-2.5-flash-lite`). OpenAI is an optional fallback only when no Gemini key is set.

The UI is a compact, minimal dark utility panel (Geist, near-black, subtle borders) with a flame icon and ember accent on Analyze. The Mac app window defaults to about 420×560.

## What you can do

- **Analyze** captures the screen and sends one downscaled JPEG frame to a vision model.
  - **Web:** browser Screen Capture API (`getDisplayMedia`).
  - **Mac app:** Electron `desktopCapturer` (no browser picker). Global shortcut **⌘⇧A** (Ctrl+Shift+A on Windows/Linux) captures without switching windows first, then brings The Flame Tool forward with the answer.
- Answers every visible schoolwork question in one pass (numbered final answers only).
- Crop / upload / type if needed. Subject picker or Auto.
- Session history in `sessionStorage`.

If Screen Recording permission is denied on macOS, the app explains how to enable it in **System Settings > Privacy & Security > Screen Recording**.

## Requirements

- Node.js 20 or newer
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) for live answers. Without a key, demo mode still works.
- For the Mac `.dmg` build: run `npm run mac:build` on a Mac.

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
GEMINI_API_KEY=AIza...
```

The key is read only on the server (`POST /api/solve`, `GET /api/status`). It is never sent to the browser.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Preferred free-tier key. |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash-lite`. |
| `GEMINI_BASE_URL` | Defaults to `https://generativelanguage.googleapis.com/v1beta`. |
| `OPENAI_API_KEY` | Optional fallback if no Gemini key is set. |
| `OPENAI_MODEL` / `OPENAI_BASE_URL` | OpenAI fallback settings. |

## Demo mode

If no Gemini (or OpenAI fallback) key is configured, answers are labeled samples. Built-in typed examples still return real final answers so you can try the UI.

## Run (web)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Mac app

```bash
npm run mac:dev
```

### API key in the Mac app

1. `GEMINI_API_KEY` in the environment, or
2. **API key** settings in the app — stored as `geminiApiKey` in `~/.flame-tool/settings.json`.

Gemini wins when present. OpenAI is used only when there is no Gemini key.

### Hotkey

**⌘⇧A** (Mac) / **Ctrl+Shift+A** (other) runs Analyze globally. The shortcut is shown in the UI and unregistered on quit.

### Build

```bash
npm run mac:build
```

Unsigned universal `.dmg` under `release/`. First open: right-click → **Open**.

## Production build (web)

```bash
npm run build
npm start
```

## API

`POST /api/solve` accepts JSON with `subject`, optional `problem`, optional `image` (data URL). Response is final answer(s) only plus a short question restatement.

`GET /api/status` returns `{ configured, provider }` where `provider` is `gemini`, `openai`, or `demo`.
