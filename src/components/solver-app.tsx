"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnswerCard } from "@/components/answer-card";
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
  type CaptureNotice,
  type CapturedFrame,
  type Crop,
} from "@/lib/capture";
import { EXAMPLES } from "@/lib/examples";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const busy = phase === "capturing" || phase === "solving";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [result]);

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
    saveHistory([item, ...history.filter((entry) => entry.id !== item.id)].slice(0, 30));
    setResult(item);
  }

  async function startCapture() {
    setNotice(null);
    setPhase("capturing");
    try {
      const frame = await captureScreenFrame();
      replacePreview(frame, "capture");
      setPhase("preview");
    } catch (error) {
      setPhase(preview ? "preview" : "idle");
      setNotice(captureErrorNotice(error));
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

  async function solveImage() {
    if (!preview) return;
    setNotice(null);
    setPhase("solving");
    try {
      const image = await frameToDataUrl(preview.blob, preview.crop);
      const solved = await postSolve({
        subject,
        image,
        sample: preview.source === "sample",
      });
      remember(toHistory(solved, preview.source));
      setPhase("solved");
    } catch (error) {
      setPhase("preview");
      setNotice({
        title: "No answer came back",
        body: error instanceof Error ? error.message : "Try that frame again.",
      });
    }
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
    }
  }

  async function onPrimary() {
    if (preview && phase === "preview") {
      await solveImage();
      return;
    }
    await startCapture();
  }

  const primaryLabel =
    phase === "capturing"
      ? "Waiting for a screen…"
      : phase === "solving"
        ? preview
          ? "Reading the frame…"
          : "Getting the answer…"
        : phase === "preview"
          ? "Analyze this frame"
          : "Analyze";

  const helperCopy =
    phase === "preview"
      ? "This frame is ready. Crop it if you want, then analyze it."
      : phase === "solved" && preview
        ? "The answer is below. Analyze again to share a different screen."
        : "Share a screen, window, or tab that shows the problem. One frame is sent.";

  return (
    <div className="flame-stage">
      <header className="relative z-10 border-b border-border/70 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
              <FlameIcon className="flame-logo h-7 w-7" />
            </span>
            <div>
              <p className="font-serif text-lg leading-none tracking-tight text-foreground">The Flame Tool</p>
              <p className="mt-1 text-xs text-muted-foreground">High-school answers, nothing else.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {configured === false && (
              <span className="hidden rounded-md border border-border bg-secondary px-3 py-1 text-xs font-medium text-accent-foreground sm:inline">
                Demo mode
              </span>
            )}
            <Sheet open={sessionOpen} onOpenChange={setSessionOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="lg:hidden">
                  Session{history.length > 0 ? ` (${history.length})` : ""}
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
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-w-0 max-w-6xl lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/70 px-4 py-6 lg:sticky lg:top-0 lg:block lg:max-h-dvh lg:overflow-y-auto">
          <HistoryPanel
            items={history}
            activeId={result?.id ?? null}
            onClear={() => saveHistory([])}
            onSelect={(item) => {
              setResult(item);
              setPhase("solved");
            }}
          />
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
          {configured === false && (
            <div className="mb-8 max-w-full break-words rounded-2xl border border-border bg-card/90 px-4 py-3 text-sm leading-6 text-foreground">
              <p>
                Demo mode is on, so answers are samples. Add{" "}
                <code className="font-mono text-[0.92em] break-all text-accent-foreground">OPENAI_API_KEY</code> to{" "}
                <code className="font-mono text-[0.92em] text-accent-foreground">.env.local</code> and restart the server
                when you want a real model to read the problem. The key stays on the server.
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto px-0"
                onClick={() => void showSampleWorksheet()}
                disabled={busy}
              >
                Try a sample worksheet
              </Button>
            </div>
          )}

          <section className="mx-auto flex min-h-[min(72vh,40rem)] w-full min-w-0 max-w-xl flex-col items-center justify-center text-center">
            <div className="rise-in flex flex-col items-center">
              <FlameIcon className="flame-logo h-16 w-16 text-primary sm:h-20 sm:w-20" />
              <h1 className="mt-5 font-serif text-5xl leading-none tracking-tight text-foreground sm:text-6xl">
                The Flame Tool
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                Point it at schoolwork. Get only the final answer.
              </p>
            </div>

            <div className="rise-in-delay mt-10 w-full">
              <Button
                type="button"
                onClick={() => void onPrimary()}
                disabled={busy}
                aria-busy={busy}
                className="analyze-cta h-auto min-h-28 w-full max-w-[22rem] rounded-full bg-gradient-to-b from-[#ff8a3d] via-[#ff5318] to-[#d62a08] px-8 py-6 text-xl font-semibold tracking-tight text-primary-foreground hover:from-[#ff9a55] hover:via-[#ff6128] hover:to-[#e23410]"
              >
                <FlameIcon className="h-7 w-7" />
                {primaryLabel}
              </Button>
              <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{helperCopy}</p>
            </div>

            <div className="rise-in-late mt-4 flex w-full flex-wrap items-center justify-center gap-2">
              {preview && (
                <Button type="button" variant="ghost" disabled={busy} onClick={() => void startCapture()}>
                  Share a different screen
                </Button>
              )}
              <Button type="button" variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
                Upload a photo
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setTyping((open) => !open)}>
                {typing ? "Hide typed problem" : "Type a problem"}
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

          <div className="mx-auto mt-2 w-full min-w-0 max-w-xl">
            <SubjectPicker value={subject} onChange={setSubject} disabled={busy} />
          </div>

          {typing && (
            <div className="mx-auto mt-5 max-w-xl">
              <label htmlFor="problem" className="mb-2 block text-sm text-muted-foreground">
                Problem
              </label>
              <Textarea
                id="problem"
                value={problem}
                maxLength={4000}
                placeholder="Paste a problem. Plain text is fine for math."
                disabled={busy}
                onChange={(event) => setProblem(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void solveText(problem, subject);
                  }
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <Button type="button" disabled={busy} onClick={() => void solveText(problem, subject)}>
                  Analyze text
                </Button>
                {problem.length > 3200 && (
                  <p className="text-xs text-muted-foreground">{4000 - problem.length} characters left</p>
                )}
              </div>
            </div>
          )}

          {notice && (
            <div
              role="alert"
              className="mx-auto mt-6 max-w-xl rounded-2xl border border-border bg-card px-4 py-3"
            >
              <p className="font-medium">{notice.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{notice.body}</p>
              {configured === false && (
                <Button
                  type="button"
                  variant="link"
                  className="mt-1 h-auto px-0"
                  onClick={() => void showSampleWorksheet()}
                  disabled={busy}
                >
                  Try a sample worksheet
                </Button>
              )}
            </div>
          )}

          {preview && phase !== "solved" && (
            <div className="mx-auto mt-6 max-w-3xl">
              <CropFrame
                url={preview.url}
                width={preview.width}
                height={preview.height}
                crop={preview.crop}
                disabled={busy}
                onCropChange={(crop) => setPreview((current) => (current ? { ...current, crop } : current))}
              />
            </div>
          )}

          {preview && phase === "solved" && (
            <div className="mx-auto mt-6 flex max-w-xl justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt="Analyzed frame"
                className="max-h-44 w-auto max-w-full rounded-xl border border-border"
              />
            </div>
          )}

          {result && (
            <div ref={answerRef} className="mx-auto mt-6 max-w-xl">
              <AnswerCard solution={result.solution} mock={result.mock} source={result.source} />
            </div>
          )}

          {!result && !preview && (
            <div className="mx-auto mt-10 w-full min-w-0 max-w-xl pb-10">
              <p className="text-sm text-muted-foreground">Or try a typed example</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <Button
                    key={example.id}
                    type="button"
                    variant="outline"
                    size="sm"
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
