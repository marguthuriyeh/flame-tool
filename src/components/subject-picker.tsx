import { SUBJECTS, type SubjectChoice } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubjectPicker({
  value,
  onChange,
  disabled,
}: {
  value: SubjectChoice;
  onChange: (value: SubjectChoice) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0 max-w-full">
      <legend className="mb-1.5 text-[11px] text-muted-foreground">Subject</legend>
      <div className="flex w-full min-w-0 gap-1 overflow-x-auto pb-0.5">
        {SUBJECTS.map((subject) => {
          const selected = value === subject;
          return (
            <button
              key={subject}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(subject)}
              className={cn(
                "shrink-0 cursor-pointer rounded-md border px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary/70 bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {subject}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
