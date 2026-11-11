"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnswerCard } from "@/components/answer-card";
import { ApiKeySettings } from "@/components/api-key-settings";
import { CropFrame } from "@/components/crop-frame";
import { FlameIcon } from "@/components/flame-icon";
import { HistoryPanel } from "@/components/history-panel";
import { SubjectPicker } from "@/components/subject-picker";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  captureErrorNotice,
  captureScreenFrame,
  fileToFrame,
  frameToDataUrl,
  loadSampleFrame,
  ScreenPermissionError,
  type CaptureNotice,
  type CapturedFrame,
  type Crop,
} from "@/lib/capture";
import { EXAMPLES } from "@/lib/examples";
import { getFlameDesktop, isElectronApp, type HotkeyCapturePayload } from "@/lib/flame-desktop";
import { getEmptyHistory, getHistorySnapshot, saveHistory, subscribeHistory } from "@/lib/history";
import type { HistoryItem, SolveResult, Source, SubjectChoice } from "@/lib/types";

type Phase = "idle" | "capturing" | "preview" | "solving" | "solved";

type Preview = {
  url: string;
  blob: Blob;
  width: number;
  height: number;
  source: Extract<Source, "capture" | "upload" | "sample">;
  crop: Crop | null;
};

export function SolverApp() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [subject, setSubject] = useState<SubjectChoice>("Auto");
  const [problem, setProblem] = useState("");
  const [typing, setTyping] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<CaptureNotice | null>(null);
  const history = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getEmptyHistory);
  const [result, setResult] = useState<HistoryItem | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [shortcut, setShortcut] = useState("⌘⇧A");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [tickMs, setTickMs] = useState(0);
  const electron = useSyncExternalStore(
    () => () => undefined,
    () => isElectronApp(),
    () => false,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef(subject);
  const historyRef = useRef(history);
  const previewRef = useRef(preview);
  const solveStartedRef = useRef<number | null>(null);
  const busy = phase === "capturing" || phase === "solving";

  useEffect(() => {
    subjectRef.current = subject;
    historyRef.current = history;
    previewRef.current = preview;
  }, [subject, history, preview]);

  useEffect(() => {
    let cancelled = false;
    async function refreshStatus() {
      try {
        const desktop = getFlameDesktop();
        if (desktop) {
          const load = desktop.getGeminiApiKey ?? desktop.getApiKey;
          const key = await load.call(desktop);
          if (!cancelled) setConfigured(Boolean(key));
          return;
        }
        const response = await fetch("/api/status", { cache: "no-store" });
        const data = (await response.json()) as { configured?: boolean };
        if (!cancelled) setConfigured(Boolean(data.configured));
      } catch {
        if (!cancelled) setConfigured(false);
      }
    }
    void refreshStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const desktop = getFlameDesktop();
    if (!desktop?.getAnalyzeShortcut) return;
    void desktop.getAnalyzeShortcut().then(setShortcut);
  }, [electron]);

  useEffect(() => {
    if (!result) return;
    answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [result]);

  useEffect(() => {
    if (phase !== "solving" || solveStartedRef.current == null) return;
    const id = window.setInterval(() => {
      setTickMs(Date.now() - (solveStartedRef.current ?? Date.now()));
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  function replacePreview(frame: CapturedFrame | null, source: Preview["source"] = "capture") {
    const previous = urlRef.current;
    if (!frame) {
      urlRef.current = null;
      if (previous) URL.revokeObjectURL(previous);
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(frame.blob);
    urlRef.current = url;
    if (previous) URL.revokeObjectURL(previous);
    setPreview({
      url,
      blob: frame.blob,
      width: frame.width,
      height: frame.height,
      source,
      crop: null,
    });
  }

  function remember(item: HistoryItem) {
    saveHistory([item, ...historyRef.current.filter((entry) => entry.id !== item.id)].slice(0, 30));
    setResult(item);
  }

  function beginSolveTimer() {
    const started = Date.now();
    solveStartedRef.current = started;
    setElapsedMs(null);
    setTickMs(0);
    return started;
  }

  function endSolveTimer(started: number) {
    const ms = Date.now() - started;
    solveStartedRef.current = null;
    setElapsedMs(ms);
    setTickMs(ms);
  }

  async function startCapture() {
    setNotice(null);
    setPhase("capturing");
    try {
      const frame = await captureScreenFrame();
      replacePreview(frame, "capture");
      setPhase("preview");
    } catch (error) {
      setPhase(previewRef.current ? "preview" : "idle");
      const nextNotice = captureErrorNotice(error);
      if (error instanceof ScreenPermissionError) {
        setNotice({
          ...nextNotice,
          body: `${nextNotice.body} You can still upload a photo or type the problem.`,
        });
      } else {
        setNotice(nextNotice);
      }
    }
  }

  async function showSampleWorksheet() {
    setNotice(null);
    try {
      const frame = await loadSampleFrame();
      replacePreview(frame, "sample");
      setPhase("preview");
    } catch (error) {
      setNotice(captureErrorNotice(error));
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    try {
      const frame = await fileToFrame(file);
      replacePreview(frame, "upload");
      setPhase("preview");
    } catch (error) {
      setNotice(captureErrorNotice(error));
    }
  }

  async function solveImageFrame(
    frame: CapturedFrame,
    source: Extract<Source, "capture" | "upload" | "sample">,
    crop: Crop | null = null,
  ) {
    setNotice(null);
    setPhase("solving");
    const started = beginSolveTimer();
    try {
      const image = await frameToDataUrl(frame.blob, crop);
      const solved = await postSolve({
        subject: subjectRef.current,
        image,
        sample: source === "sample",
      });
      remember(toHistory(solved, source));
      setPhase("solved");
    } catch (error) {
      setPhase("preview");
      setNotice({
        title: "No answer came back",
        body: error instanceof Error ? error.message : "Try that frame again.",
      });
    } finally {
      endSolveTimer(started);
    }
  }

  async function solveImage() {
    const current = previewRef.current;
    if (!current) return;
    await solveImageFrame(
      { blob: current.blob, width: current.width, height: current.height },
      current.source,
      current.crop,
    );
  }

  async function solveText(text: string, subjectChoice: SubjectChoice) {
    const trimmed = text.trim();
    if (!trimmed) {
      setNotice({
        title: "Type a problem first",
        body: "Paste a question, or use Analyze to grab it from the screen.",
      });
      return;
    }
    setNotice(null);
    replacePreview(null);
    setPhase("solving");
    const started = beginSolveTimer();
    try {
      const solved = await postSolve({ subject: subjectChoice, problem: trimmed });
      remember(toHistory(solved, "text"));
      setPhase("solved");
    } catch (error) {
      setPhase("idle");
      setNotice({
        title: "No answer came back",
        body: error instanceof Error ? error.message : "Try that problem again.",
      });
    } finally {
      endSolveTimer(started);
    }
  }

  async function onPrimary() {
    if (previewRef.current && phase === "preview") {
      await solveImage();
      return;
    }
    await startCapture();
  }

  async function handleHotkeyPayload(payload: HotkeyCapturePayload) {
    if (!payload.ok) {
      setPhase("idle");
      if (payload.code === "permission-denied") {
        setNotice({
          title: "Screen Recording is off",
          body: `${payload.message} You can still upload a photo or type the problem.`,
        });
      } else {
        setNotice({ title: "Hotkey Analyze failed", body: payload.message });
      }
      return;
    }

    const bytes = Uint8Array.from(atob(payload.base64), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: payload.mime || "image/jpeg" });
    const frame: CapturedFrame = {
      blob,
      width: payload.width,
      height: payload.height,
    };
    replacePreview(frame, "capture");
    await solveImageFrame(frame, "capture", null);
  }

  useEffect(() => {
    const desktop = getFlameDesktop();
    if (!desktop?.onHotkeyAnalyze) return;
    return desktop.onHotkeyAnalyze((payload) => {
      void handleHotkeyPayload(payload);
    });
    // Intentionally subscribe once; handlers use refs for latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const primaryLabel =
    phase === "capturing"
      ? "Waiting…"
      : phase === "solving"
        ? preview
          ? "Reading…"
          : "Solving…"
        : phase === "preview"
          ? "Analyze frame"
          : "Analyze";

  const helperCopy = electron
    ? phase === "preview"
      ? "Crop if needed, then analyze."
      : `Captures this Mac’s main screen. Hotkey ${shortcut}.`
    : phase === "preview"
      ? "Crop if needed, then analyze."
      : "Share a screen, then one frame is sent.";

  const timingLabel =
    phase === "solving"
      ? `${(tickMs / 1000).toFixed(1)}s`
      : elapsedMs != null
        ? `${(elapsedMs / 1000).toFixed(1)}s`
        : null;

  return (
    <div className="flame-shell">
      <div className="flame-panel">
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary">
              <FlameIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium tracking-tight text-foreground">The Flame Tool</p>
              <p className="truncate text-[11px] text-muted-foreground">Final answers only</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {configured === false && (
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                Demo
              </span>
            )}
            <Sheet open={sessionOpen} onOpenChange={setSessionOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                  Session{history.length > 0 ? ` ${history.length}` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>This session</SheetTitle>
                </SheetHeader>
                <HistoryPanel
                  items={history}
                  activeId={result?.id ?? null}
                  hideHeading
                  onClear={() => saveHistory([])}
                  onSelect={(item) => {
                    setResult(item);
                    setSessionOpen(false);
                    setPhase("solved");
                  }}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
          {configured === false && (
            <div className="rounded-lg border border-border bg-card px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">
              {electron ? (
                <>Demo mode. Add a free Gemini API key below (no OpenAI credits needed).</>
              ) : (
                <>
                  Demo mode. Set <code className="font-mono text-accent-foreground">GEMINI_API_KEY</code> in{" "}
                  <code className="font-mono text-accent-foreground">.env.local</code> — free from{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Google AI Studio
                  </a>
                  .
                </>
              )}{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => void showSampleWorksheet()}
                disabled={busy}
              >
                Sample worksheet
              </button>
            </div>
          )}

          <section className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => void onPrimary()}
              disabled={busy}
              aria-busy={busy}
              className="analyze-compact h-10 w-full rounded-lg text-[13px] font-semibold tracking-tight"
            >
              {phase === "solving" ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <FlameIcon className="h-4 w-4" />
              )}
              {primaryLabel}
            </Button>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <p className="leading-4">{helperCopy}</p>
              {timingLabel && (
                <span className="shrink-0 tabular-nums text-accent-foreground">{timingLabel}</span>
              )}
            </div>
            {electron && (
              <p className="text-center text-[10px] text-muted-foreground">
                Global shortcut <span className="font-medium text-foreground">{shortcut}</span> analyzes
                without leaving your other window.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-1">
              {preview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  disabled={busy}
                  onClick={() => void startCapture()}
                >
                  Reshare
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Upload
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={busy}
                onClick={() => setTyping((open) => !open)}
              >
                {typing ? "Hide text" : "Type"}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void onFile(file);
              }}
            />
          </section>

          <SubjectPicker value={subject} onChange={setSubject} disabled={busy} />

          {typing && (
            <div className="space-y-2">
              <label htmlFor="problem" className="block text-[11px] text-muted-foreground">
                Problem
              </label>
              <Textarea
                id="problem"
                value={problem}
                maxLength={4000}
                placeholder="Paste a problem…"
                disabled={busy}
                className="min-h-20 rounded-lg px-2.5 py-2 text-[13px]"
                onChange={(event) => setProblem(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void solveText(problem, subject);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 text-[12px]"
                disabled={busy}
                onClick={() => void solveText(problem, subject)}
              >
                Analyze text
              </Button>
            </div>
          )}

          {electron && (
            <ApiKeySettings
              configured={configured}
              onConfiguredChange={(value) => setConfigured(value)}
            />
          )}

          {notice && (
            <div role="alert" className="rounded-lg border border-border bg-card px-2.5 py-2">
              <p className="text-[12px] font-medium">{notice.title}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{notice.body}</p>
              {notice.title === "Screen Recording is off" && electron && (
                <Button
                  type="button"
                  variant="link"
                  className="mt-1 h-auto px-0 text-[11px]"
                  onClick={() => void getFlameDesktop()?.openScreenSettings()}
                >
                  Open Screen Recording settings
                </Button>
              )}
            </div>
          )}

          {preview && phase !== "solved" && (
            <CropFrame
              url={preview.url}
              width={preview.width}
              height={preview.height}
              crop={preview.crop}
              disabled={busy}
              onCropChange={(crop) => setPreview((current) => (current ? { ...current, crop } : current))}
            />
          )}

          {preview && phase === "solved" && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt="Analyzed frame"
                className="max-h-24 w-auto max-w-full rounded-md border border-border"
              />
            </div>
          )}

          {phase === "solving" && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-[11px] text-muted-foreground">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              Reading the problem and writing final answers…
            </div>
          )}

          {result && (
            <div ref={answerRef}>
              <AnswerCard solution={result.solution} mock={result.mock} source={result.source} />
              {elapsedMs != null && (
                <p className="mt-1.5 text-right text-[10px] tabular-nums text-muted-foreground">
                  Answered in {(elapsedMs / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          )}

          {!result && !preview && phase !== "solving" && (
            <div className="pb-1">
              <p className="text-[11px] text-muted-foreground">Examples</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {EXAMPLES.map((example) => (
                  <Button
                    key={example.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    disabled={busy}
                    onClick={() => {
                      setSubject(example.subject);
                      setProblem(example.problem);
                      setTyping(true);
                      void solveText(example.problem, example.subject);
                    }}
                  >
                    {example.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

async function postSolve(body: {
  subject: SubjectChoice;
  problem?: string;
  image?: string;
  sample?: boolean;
}): Promise<SolveResult> {
  const response = await fetch("/api/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | (SolveResult & { error?: string })
    | null;
  if (!response.ok || !payload?.solution) {
    throw new Error(payload?.error || "The Flame Tool couldn't get an answer.");
  }
  return payload;
}

function toHistory(result: SolveResult, source: Source): HistoryItem {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    source,
    mock: result.mock,
    solution: result.solution,
  };
}
