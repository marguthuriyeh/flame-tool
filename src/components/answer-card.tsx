import { MathText } from "@/components/math-text";
import { plainSnippet } from "@/lib/history";
import type { Solution, Source } from "@/lib/types";

const sourceLabel: Record<Source, string> = {
  text: "Typed problem",
  capture: "Screen capture",
  upload: "Uploaded photo",
  sample: "Sample worksheet",
};

export function AnswerCard({
  solution,
  mock,
  source,
}: {
  solution: Solution;
  mock: boolean;
  source: Source;
}) {
  const centered = solution.answer.includes("$$") || plainSnippet(solution.answer).length < 80;

  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-6 shadow-[0_16px_40px_rgba(42,33,28,0.05)] sm:px-7">
      <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>{solution.detectedSubject}</span>
        <span aria-hidden="true">·</span>
        <span>{sourceLabel[source]}</span>
        {mock && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-primary">Sample answer</span>
          </>
        )}
      </div>
      <div className="question-math mt-4 text-base leading-7 text-foreground">
        <MathText text={solution.problemText} />
      </div>
      <h2 className="mt-6 font-serif text-sm font-medium uppercase tracking-[0.16em] text-primary">
        Answer
      </h2>
      <div className={`answer-math mt-2 text-3xl leading-snug text-foreground ${centered ? "text-center" : "text-left"}`}>
        <MathText text={solution.answer} />
      </div>
    </section>
  );
}
