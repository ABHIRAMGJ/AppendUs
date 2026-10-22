import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Code2, Send } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiOutput, useGenerate } from "@/components/app/AiResult";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coding")({
  head: () => ({ meta: [{ title: "Coding Practice — AI CareerOS" }, { name: "description", content: "Solve coding problems and get AI code review." }] }),
  component: Coding,
});

const PROBLEMS = [
  { t: "Two Sum", d: "Easy", p: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target." },
  { t: "Valid Parentheses", d: "Easy", p: "Given a string containing just '(', ')', '{', '}', '[' and ']', determine if the input string is valid." },
  { t: "Reverse Linked List", d: "Easy", p: "Given the head of a singly linked list, reverse the list and return the reversed list." },
  { t: "Merge Two Sorted Lists", d: "Medium", p: "Merge two sorted linked lists into one sorted list and return its head." },
  { t: "Longest Substring Without Repeating Characters", d: "Medium", p: "Given a string s, find the length of the longest substring without repeating characters." },
  { t: "Binary Tree Level Order Traversal", d: "Medium", p: "Return the level order traversal of a binary tree's node values (left to right, level by level)." },
  { t: "Number of Islands", d: "Medium", p: "Given an m x n grid of '1's (land) and '0's (water), return the number of islands." },
  { t: "Coin Change", d: "Medium", p: "Given coins of different denominations and an amount, return the fewest coins needed to make that amount, or -1." },
  { t: "Trapping Rain Water", d: "Hard", p: "Given n non-negative integers representing an elevation map, compute how much water it can trap after raining." },
];
const STARTER: Record<string, string> = {
  Python: "def solve():\n    # Write your solution here\n    pass\n",
  JavaScript: "function solve() {\n  // Write your solution here\n}\n",
  Java: "class Solution {\n    // Write your solution here\n}\n",
  "C++": "class Solution {\npublic:\n    // Write your solution here\n};\n",
};

function Coding() {
  const [idx, setIdx] = useState(0);
  const [lang, setLang] = useState("Python");
  const [code, setCode] = useState(STARTER.Python);
  const gen = useGenerate("code");
  const prob = PROBLEMS[idx];
  const color = (d: string) => (d === "Easy" ? "bg-success/15 text-success" : d === "Medium" ? "bg-warning/20 text-warning-foreground dark:text-warning" : "bg-destructive/15 text-destructive");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader icon={Code2} title="Coding Practice" description="Improve your coding skills with real problems" />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="surface h-fit p-2">
          {PROBLEMS.map((p, i) => (
            <button key={p.t} onClick={() => { setIdx(i); gen.stop(); }} className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm", i === idx ? "bg-accent font-semibold" : "hover:bg-muted")}>
              <span className="min-w-0 truncate">{p.t}</span><Badge variant="secondary" className={color(p.d)}>{p.d}</Badge>
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <div className="surface p-5"><h2 className="text-lg font-semibold">{prob.t}</h2><p className="mt-1 text-sm text-muted-foreground">{prob.p}</p></div>
          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <Select value={lang} onValueChange={(v) => { setLang(v); setCode(STARTER[v]); }}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(STARTER).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="hero" disabled={gen.loading} onClick={() => gen.run({ language: lang, problem: `${prob.t}: ${prob.p}`, code })}>
                <Send /> {gen.loading ? "Reviewing..." : "Submit for review"}
              </Button>
            </div>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
              className="h-72 w-full resize-y bg-muted/40 p-4 font-mono text-sm outline-none" aria-label="Code editor" />
          </div>
          <div className="surface"><AiOutput text={gen.text} loading={gen.loading} empty="Submit your solution to get a static AI review: correctness, edge cases and complexity." /></div>
        </div>
      </div>
    </div>
  );
}
