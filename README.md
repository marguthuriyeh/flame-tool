# The Flame Tool

The Flame Tool is an AI problem solver for high-school schoolwork — math, science, English, history, and similar. A student clicks **Analyze**, shares a screen (or uploads a photo / types a question), and gets **only the final answer**. No steps. No explanation. For multiple choice, just the letter and the choice text.

The UI is a compact, minimal dark utility panel (Geist, near-black, subtle borders) inspired by sleek desktop tools, with a flame icon and ember accent on Analyze. The Mac app window defaults to about 420×560.

It runs as a website and as a Mac app (Electron) with the same UI.

## What you can do

- **Analyze** captures the screen and sends one frame to a vision model.
  - **Web:** uses the browser Screen Capture API (`getDisplayMedia`). You pick a screen, window, or tab.
  - **Mac app:** captures the main display with Electron `desktopCapturer` (no browser picker). If macOS Screen Recording permission is denied, the app explains how to enable it in **System Settings > Privacy & Security > Screen Recording**.
- That frame is sent to a vision model that reads the schoolwork on screen and returns the final answer.
- Crop the frame, or keep the full picture.
- Upload a photo or type a problem if screen sharing is unavailable.
- Pick a subject (Math, Physics, Chemistry, Biology, History, English) or leave it on Auto.
- Review questions from this browser tab / app session. History stays in `sessionStorage` and clears when the tab or window closes.

If permission is denied or the share prompt is closed, the page says so and offers a photo upload, a typed problem, or (in demo mode) a sample worksheet.

## Requirements

- Node.js 20 or newer
- An OpenAI API key only if you want live answers. Without one, the app runs in demo mode.
- For the Mac app build: run `npm run mac:build` on a Mac. This Linux/cloud VM cannot produce a `.dmg` (electron-builder needs macOS tools such as `sips` / `@electron/universal`).

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

The key is read only on the server, in `POST /api/solve` and `GET /api/status`. It is not prefixed with `NEXT_PUBLIC_` and is never sent to the browser.

Optional settings:

| Variable | Purpose |
| --- | --- |
| `OPENAI_MODEL` | Vision-capable chat model. Defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | OpenAI-compatible base URL. Defaults to `https://api.openai.com/v1`. |

## Demo mode

If `OPENAI_API_KEY` is missing or blank, the app still runs. A banner explains how to add the key. Analyze, crop, upload, and typed problems all work, and the answers are labeled samples. The built-in examples (a quadratic, a thrown ball, a multiple-choice biology question, and others) return real final answers so the interface can be tried without a model. A captured or uploaded photo that is not the sample worksheet does not pretend to have been read.

Restart the web server after changing `.env.local`.

## Run (web)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `localhost` is allowed by Next.js. This project also allows `127.0.0.1` in `allowedDevOrigins`, which matters when the dev server is bound to `0.0.0.0`.

To use another port:

```bash
npm run dev -- -p 47281
```

Screen capture needs a secure page (localhost or HTTPS) and a browser that supports `getDisplayMedia` (current Chrome, Edge, Firefox, or Safari). The browser asks which screen to share. Choosing nothing, or blocking the prompt, does not break the page.

## Mac app

### Develop

```bash
npm run mac:dev
```

This starts the Next.js dev server and opens The Flame Tool in Electron. The window title and Dock name are **The Flame Tool**.

### API key in the Mac app

1. Environment variable `OPENAI_API_KEY` (wins if set), or
2. **API key settings** in the app UI — stored locally at `~/.flame-tool/settings.json` on this Mac.

Demo mode still works with no key.

### Build a .dmg (Apple Silicon + Intel universal)

On a Mac:

```bash
npm run mac:build
```

That builds the Next standalone server, then uses electron-builder to write an unsigned universal `.dmg` under `release/`.

### Install an unsigned Mac build

Apple Gatekeeper blocks unsigned apps by default. To open The Flame Tool the first time:

1. Open the `.dmg` and drag **The Flame Tool** into Applications (or another folder).
2. In Finder, **right-click** (or Control-click) **The Flame Tool** → **Open**.
3. Click **Open** in the dialog that says the developer cannot be verified.
4. After that, you can launch it from the Dock or Applications like any other app.

If Analyze cannot see the screen, open **System Settings > Privacy & Security > Screen Recording**, enable **The Flame Tool**, then quit and reopen the app.

## Production build (web)

```bash
npm run build
npm start
```

## API

`POST /api/solve` accepts JSON:

```json
{
  "subject": "Auto",
  "problem": "Solve 2x^2 - 8x + 6 = 0.",
  "image": "data:image/jpeg;base64,..."
}
```

Send `problem`, `image`, or both. The response is the final answer plus a one-line restatement of the question. The model is instructed not to return steps or an explanation. Multiple-choice answers are letter + choice text only.

`GET /api/status` returns `{ "configured": true }` or `{ "configured": false }`. It does not return the key.
