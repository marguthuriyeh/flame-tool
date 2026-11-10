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
      <legend className="mb-2 text-sm text-muted-foreground">Subject, if you want to set it</legend>
      <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
        {SUBJECTS.map((subject) => {
          const selected = value === subject;
          return (
            <button
              key={subject}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(subject)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              {subject === "Auto" ? "Auto" : subject}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
