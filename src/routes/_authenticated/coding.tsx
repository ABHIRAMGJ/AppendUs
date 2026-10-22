import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Code2, Play, Send, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/data";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiOutput, useGenerate } from "@/components/app/AiResult";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coding")({
  head: () => ({ meta: [{ title: "Coding Practice — AppendUs" }, { name: "description", content: "Solve coding problems with test cases and get AI code review." }] }),
  component: Coding,
});

const PROBLEMS = [
  { t: "Two Sum", d: "Easy", p: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.", tests: ["nums = [2,7,11,15], target = 9 → [0,1]", "nums = [3,2,4], target = 6 → [1,2]", "nums = [3,3], target = 6 → [0,1]"] },
  { t: "Valid Parentheses", d: "Easy", p: "Given a string containing just '(', ')', '{', '}', '[' and ']', determine if the input string is valid.", tests: ["s = \"()[]{}\" → true", "s = \"(]\" → false", "s = \"([)]\" → false"] },
  { t: "Reverse Linked List", d: "Easy", p: "Given the head of a singly linked list, reverse the list and return the reversed list.", tests: ["[1,2,3,4,5] → [5,4,3,2,1]", "[1,2] → [2,1]", "[] → []"] },
  { t: "Merge Two Sorted Lists", d: "Medium", p: "Merge two sorted linked lists into one sorted list and return its head.", tests: ["[1,2,4] + [1,3,4] → [1,1,2,3,4,4]", "[] + [] → []", "[] + [0] → [0]"] },
  { t: "Longest Substring Without Repeating Characters", d: "Medium", p: "Given a string s, find the length of the longest substring without repeating characters.", tests: ["s = \"abcabcbb\" → 3", "s = \"bbbbb\" → 1", "s = \"pwwkew\" → 3"] },
  { t: "Binary Tree Level Order Traversal", d: "Medium", p: "Return the level order traversal of a binary tree's node values (left to right, level by level).", tests: ["[3,9,20,null,null,15,7] → [[3],[9,20],[15,7]]", "[1] → [[1]]", "[] → []"] },
  { t: "Number of Islands", d: "Medium", p: "Given an m x n grid of '1's (land) and '0's (water), return the number of islands.", tests: ["grid with one connected land mass → 1", "grid with three separated masses → 3", "all water → 0"] },
  { t: "Coin Change", d: "Medium", p: "Given coins of different denominations and an amount, return the fewest coins needed to make that amount, or -1.", tests: ["coins = [1,2,5], amount = 11 → 3", "coins = [2], amount = 3 → -1", "coins = [1], amount = 0 → 0"] },
  { t: "Trapping Rain Water", d: "Hard", p: "Given n non-negative integers representing an elevation map, compute how much water it can trap after raining.", tests: ["[0,1,0,2,1,0,1,3,2,1,2,1] → 6", "[4,2,0,3,2,5] → 9"] },
];
const STARTER: Record<string, string> = {
  Python: "def solve():\n    # Write your solution here\n    pass\n",
  JavaScript: "function solve() {\n  // Write your solution here\n}\n",
  Java: "class Solution {\n    // Write your solution here\n}\n",
  "C++": "class Solution {\npublic:\n    // Write your solution here\n};\n",
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Coding() {
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [lang, setLang] = useState("Python");
  const [code, setCode] = useState(STARTER["Python"]!);
  const [seconds, setSeconds] = useState(0);
  const [timing, setTiming] = useState(false);
  const gen = useGenerate("code");
  const prob = PROBLEMS[idx] ?? PROBLEMS[0]!;
  const savedFor = useRef("");
  const color = (d: string) => (d === "Easy" ? "bg-success/15 text-success" : d === "Medium" ? "bg-warning/20 text-warning-foreground dark:text-warning" : "bg-destructive/15 text-destructive");

  useEffect(() => {
    if (!timing) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timing]);

  const { data: history = [] } = useQuery({
    queryKey: ["code-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("code_submissions").select("id,problem,language,created_at").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });

  // Save the submission once a review finishes streaming.
  useEffect(() => {
    if (gen.loading || !gen.text || savedFor.current === gen.text) return;
    savedFor.current = gen.text;
    (async () => {
      try {
        const { error } = await supabase.from("code_submissions").insert({
          user_id: await currentUserId(), problem: prob.t, language: lang, code, review: gen.text,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["code-submissions"] });
        toast.success("Submission saved to your history");
      } catch (e) {
        toast.error(`Review shown but couldn't be saved: ${(e as Error).message}`);
      }
    })();
  }, [gen.loading, gen.text, prob.t, lang, code, qc]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader icon={Code2} title="Coding Practice" description="Solve problems against test cases and get an AI code review" />
      <Tabs defaultValue="practice">
        <TabsList><TabsTrigger value="practice">Practice</TabsTrigger><TabsTrigger value="history">My submissions</TabsTrigger></TabsList>
        <TabsContent value="practice" className="pt-4">
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <div className="surface h-fit p-2">
              {PROBLEMS.map((p, i) => (
                <button key={p.t} onClick={() => { setIdx(i); gen.stop(); }} className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm", i === idx ? "bg-accent font-semibold" : "hover:bg-muted")}>
                  <span className="min-w-0 truncate">{p.t}</span><Badge variant="secondary" className={color(p.d)}>{p.d}</Badge>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div className="surface p-5">
                <h2 className="text-lg font-semibold">{prob.t}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{prob.p}</p>
                <div className="mt-3 rounded-lg bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test cases</p>
                  <ul className="mt-1 space-y-1 font-mono text-xs">{prob.tests.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              </div>
              <div className="surface overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Select value={lang} onValueChange={(v) => { setLang(v); setCode(STARTER[v] ?? ""); }}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.keys(STARTER).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => (timing ? setTiming(false) : (setSeconds(0), setTiming(true)))}>
                      {timing ? <><Timer /> {fmt(seconds)}</> : <><Play /> Start timer</>}
                    </Button>
                  </div>
                  <Button size="sm" variant="hero" disabled={gen.loading} onClick={() => { setTiming(false); gen.run({ language: lang, problem: `${prob.t}: ${prob.p}`, tests: prob.tests.join("\n"), code, time_taken: timing || seconds > 0 ? fmt(seconds) : "not timed" }); }}>
                    <Send /> {gen.loading ? "Reviewing..." : "Submit for review"}
                  </Button>
                </div>
                <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
                  className="h-72 w-full resize-y bg-muted/40 p-4 font-mono text-sm outline-none" aria-label="Code editor" />
              </div>
              <div className="surface"><AiOutput text={gen.text} loading={gen.loading} empty="Submit your solution to get an AI review: correctness against the test cases, edge cases and complexity. Reviews are static analysis — no code is executed." /></div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          {history.length === 0 ? (
            <p className="surface p-6 text-sm text-muted-foreground">No submissions yet. Solve a problem and submit it for review.</p>
          ) : (
            <div className="surface divide-y">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-4 p-4">
                  <p className="font-medium">{h.problem}</p>
                  <p className="text-xs text-muted-foreground">{h.language} · {new Date(h.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
