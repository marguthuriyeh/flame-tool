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
      setMessage(result.configured ? "Saved. Live answers on." : "Cleared. Demo mode on.");
    } catch {
      setMessage("Could not save the API key.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {configured ? "Live answers on" : "Demo — add API key"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide key" : "API key"}
        </Button>
      </div>
      {open && (
        <div className="rounded-lg border border-border bg-card px-2.5 py-2.5">
          <label htmlFor="api-key" className="mb-1.5 block text-[11px] text-muted-foreground">
            OpenAI API key (this Mac only)
          </label>
          <input
            id="api-key"
            type="password"
            autoComplete="off"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="sk-..."
            className="flex h-8 w-full rounded-md border border-input bg-black/40 px-2 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 flex items-center gap-1.5">
            <Button type="button" size="sm" className="h-7 text-[11px]" disabled={saving} onClick={() => void save()}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              disabled={saving || !key}
              onClick={() => {
                setKey("");
                void desktop.setApiKey("").then((result) => {
                  onConfiguredChange(result.configured);
                  setMessage("Cleared. Demo mode on.");
                });
              }}
            >
              Clear
            </Button>
          </div>
          {message && <p className="mt-2 text-[11px] text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
}
