"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import type { PluggableList } from "unified";

const components: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  h1: ({ children }) => <p className="m-0">{children}</p>,
  h2: ({ children }) => <p className="m-0">{children}</p>,
  h3: ({ children }) => <p className="m-0">{children}</p>,
  a: ({ children }) => <span>{children}</span>,
  img: () => null,
  ul: ({ children }) => <ul className="my-1 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  code: ({ children }) => <code className="font-mono text-[0.92em]">{children}</code>,
};

const remarkPlugins: PluggableList = [remarkMath];
const rehypePlugins: PluggableList = [[rehypeKatex, { throwOnError: false, strict: "ignore" }]];

export function MathText({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
      {text}
    </ReactMarkdown>
  );
}
