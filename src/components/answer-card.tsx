import { MathText } from "@/components/math-text";
import { plainSnippet } from "@/lib/history";
import type { Solution, Source } from "@/lib/types";

const sourceLabel: Record<Source, string> = {
  text: "Typed",
  capture: "Screen",
  upload: "Photo",
  sample: "Sample",
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
  const multi = /(?:^|\n)\s*(?:\d+[).]|[A-Za-z][).])\s*/.test(solution.answer);
  const centered =
    !multi && (solution.answer.includes("$$") || plainSnippet(solution.answer).length < 80);

  return (
    <section className="rounded-lg border border-border bg-card px-3 py-3">
      <div className="flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span>{solution.detectedSubject}</span>
        <span aria-hidden="true">·</span>
        <span>{sourceLabel[source]}</span>
        {mock && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-primary">Sample</span>
          </>
        )}
      </div>
      <div className="question-math mt-2 text-[12px] leading-5 text-muted-foreground">
        <MathText text={solution.problemText} />
      </div>
      <h2 className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
        {multi ? "Answers" : "Answer"}
      </h2>
      <div
        className={`answer-math mt-1 whitespace-pre-wrap text-[18px] leading-snug text-foreground ${centered ? "text-center text-[22px]" : "text-left"}`}
      >
        <MathText text={solution.answer} />
      </div>
    </section>
  );
}
