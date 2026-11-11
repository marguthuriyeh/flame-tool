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
        {hideHeading ? <span /> : <h2 className="text-sm font-medium">This session</h2>}
        {items.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          Analyzed questions from this session show up here.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5 overflow-y-auto pb-3">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "w-full cursor-pointer rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary/60 bg-secondary"
                      : "border-border bg-transparent hover:bg-muted",
                  )}
                >
                  <span className="line-clamp-2 text-[12px] text-foreground">
                    {plainSnippet(item.solution.problemText)}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {plainSnippet(item.solution.answer)}
                  </span>
                  <span className="mt-1 flex gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
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
