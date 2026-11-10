# The Flame Tool

The Flame Tool is an AI problem solver for high-school schoolwork — math, science, English, history, and similar. A student clicks **Analyze**, shares a screen (or uploads a photo / types a question), and gets **only the final answer**. No steps. No explanation. For multiple choice, just the letter and the choice text.

The UI uses a flame theme: dark charcoal backgrounds with orange, red, and yellow gradients, a flame logo, and a large centered Analyze button.

## What you can do

- **Analyze** uses the browser Screen Capture API (`getDisplayMedia`). You pick a screen, window, or tab, and the app grabs one frame.
- That frame is sent to a vision model that reads the schoolwork on screen and returns the final answer.
- Crop the frame, or keep the full picture.
- Upload a photo or type a problem if screen sharing is unavailable.
- Pick a subject (Math, Physics, Chemistry, Biology, History, English) or leave it on Auto.
- Review questions from this browser tab. History stays in `sessionStorage` and clears when the tab closes.

If permission is denied or the share prompt is closed, the page says so and offers a photo upload, a typed problem, or (in demo mode) a sample worksheet.

## Requirements

- Node.js 20 or newer
- An OpenAI API key only if you want live answers. Without one, the app runs in demo mode.

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

Restart the dev server after changing `.env.local`.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `localhost` is allowed by Next.js. This project also allows `127.0.0.1` in `allowedDevOrigins`, which matters when the dev server is bound to `0.0.0.0`.

To use another port:

```bash
npm run dev -- -p 47281
```

Screen capture needs a secure page (localhost or HTTPS) and a browser that supports `getDisplayMedia` (current Chrome, Edge, Firefox, or Safari). The browser asks which screen to share. Choosing nothing, or blocking the prompt, does not break the page.

## Production build

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
