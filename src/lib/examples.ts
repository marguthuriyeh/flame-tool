import type { SubjectChoice } from "@/lib/types";

export type Example = {
  id: string;
  label: string;
  subject: Exclude<SubjectChoice, "Auto">;
  problem: string;
  problemText: string;
  answer: string;
  tests: string[];
};

export const EXAMPLES: Example[] = [
  {
    id: "quadratic",
    label: "Quadratic",
    subject: "Math",
    problem: "Solve 2x^2 - 8x + 6 = 0.",
    problemText: "Solve $2x^2 - 8x + 6 = 0$.",
    answer: "$x = 1$ or $x = 3$",
    tests: ["2x^2 - 8x + 6", "2x² - 8x + 6", "2x² − 8x + 6"],
  },
  {
    id: "projectile",
    label: "Thrown ball",
    subject: "Physics",
    problem:
      "A ball is thrown straight up at 20 m/s. How long is it in the air, and how high does it go? Use g = 10 m/s^2 and ignore air resistance.",
    problemText:
      "A ball is thrown straight up at $20\\text{ m/s}$. How long is it in the air, and how high does it go? ($g = 10\\text{ m/s}^2$)",
    answer: "$4\\text{ s}$ in the air, reaching $20\\text{ m}$.",
    tests: ["thrown straight up", "20 m/s"],
  },
  {
    id: "water",
    label: "Burning hydrogen",
    subject: "Chemistry",
    problem:
      "How many grams of water form when 4.0 g of hydrogen gas burns completely? 2H2 + O2 -> 2H2O. Use 2.0 g/mol for H2 and 18.0 g/mol for H2O.",
    problemText:
      "How many grams of water form when $4.0\\text{ g}$ of hydrogen burns completely? $2\\mathrm{H}_2 + \\mathrm{O}_2 \\rightarrow 2\\mathrm{H}_2\\mathrm{O}$",
    answer: "$36\\text{ g}$ of water",
    tests: ["hydrogen", "2h2", "h2o"],
  },
  {
    id: "mitosis",
    label: "Mitosis",
    subject: "Biology",
    problem:
      "What does mitosis produce, and why does a body cell end with the same number of chromosomes it started with?",
    problemText:
      "What does mitosis produce, and why does a body cell keep the same chromosome number?",
    answer:
      "Two nuclei with the same chromosome number as the parent cell. The chromosomes are copied, then separated evenly.",
    tests: ["mitosis"],
  },
  {
    id: "cell-power",
    label: "Multiple choice",
    subject: "Biology",
    problem:
      "Which organelle produces most of a cell's ATP? A) nucleus B) mitochondria C) ribosome D) Golgi apparatus",
    problemText: "Which organelle produces most of a cell's ATP?",
    answer: "B) mitochondria",
    tests: ["golgi apparatus", "which organelle produces most"],
  },
  {
    id: "stamp",
    label: "Stamp Act",
    subject: "History",
    problem:
      "Why did the Stamp Act of 1765 anger so many American colonists? What argument did they use?",
    problemText: "Why did the Stamp Act of 1765 anger American colonists?",
    answer:
      "They called it taxation without representation: Parliament taxed the colonies, and the colonists had no members in Parliament.",
    tests: ["stamp act"],
  },
  {
    id: "gatsby",
    label: "Green light",
    subject: "English",
    problem:
      "In The Great Gatsby, what does the green light represent?",
    problemText: "What does the green light in The Great Gatsby represent?",
    answer:
      "Gatsby's longing for Daisy, and the future he keeps reaching for but cannot have.",
    tests: ["green light", "gatsby"],
  },
];
