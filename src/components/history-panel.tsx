import { plainSnippet } from "@/lib/history";
import type { HistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const sourceLabel: Record<HistoryItem["source"], string> = {
  text: "Typed",
  capture: "Screen",
  upload: "Photo",
  sample: "Sample",
};

export function HistoryPanel({
  items,
  activeId,
  onSelect,
  onClear,
  hideHeading = false,
}: {
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  hideHeading?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3">
        {hideHeading ? <span /> : <h2 className="font-serif text-lg">This session</h2>}
        {items.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Questions you analyze in this tab show up here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2 overflow-y-auto pb-4">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-secondary"
                      : "border-border bg-black/20 hover:bg-accent",
                  )}
                >
                  <span className="line-clamp-2 text-sm text-foreground">
                    {plainSnippet(item.solution.problemText)}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {plainSnippet(item.solution.answer)}
                  </span>
                  <span className="mt-1.5 flex gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span>{item.solution.detectedSubject}</span>
                    <span>{sourceLabel[item.source]}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
