"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFlameDesktop } from "@/lib/flame-desktop";

export function ApiKeySettings({
  configured,
  onConfiguredChange,
}: {
  configured: boolean | null;
  onConfiguredChange: (configured: boolean) => void;
}) {
  const desktop = getFlameDesktop();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    desktop.getApiKey().then((value) => {
      if (!cancelled) setKey(value);
    });
    return () => {
      cancelled = true;
    };
  }, [desktop]);

  if (!desktop) return null;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await desktop!.setApiKey(key);
      onConfiguredChange(result.configured);
      setMessage(
        result.configured
          ? "API key saved on this Mac. Live answers are on."
          : "API key cleared. Demo mode is on.",
      );
    } catch {
      setMessage("Could not save the API key.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-xl text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {configured
            ? "Live answers are on for this Mac app."
            : "Demo mode — add an API key for live answers."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide API key" : "API key settings"}
        </Button>
      </div>
      {open && (
        <div className="mt-3 rounded-2xl border border-border bg-card/95 px-4 py-4">
          <label htmlFor="api-key" className="mb-2 block text-sm text-muted-foreground">
            OpenAI API key (stored only on this Mac)
          </label>
          <input
            id="api-key"
            type="password"
            autoComplete="off"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="sk-..."
            className="flex h-11 w-full rounded-xl border border-input bg-black/30 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              Save key
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saving || !key}
              onClick={() => {
                setKey("");
                void desktop.setApiKey("").then((result) => {
                  onConfiguredChange(result.configured);
                  setMessage("API key cleared. Demo mode is on.");
                });
              }}
            >
              Clear
            </Button>
          </div>
          {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            You can also set <code className="font-mono">OPENAI_API_KEY</code> in the environment
            before launching. Env wins over the saved field.
          </p>
        </div>
      )}
    </div>
  );
}
