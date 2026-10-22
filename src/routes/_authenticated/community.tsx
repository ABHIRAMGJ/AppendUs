import { createFileRoute, Link } from "@tanstack/react-router";
import { MessagesSquare, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "Community — AI CareerOS" }, { name: "description", content: "Learn, share and grow together — coming soon." }] }),
  component: Community,
});

function Community() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader icon={Users} title="Community" description="Learn, share and grow together" />
      <div className="surface p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-foreground"><MessagesSquare className="h-8 w-8" /></div>
        <h2 className="mt-4 text-2xl font-bold">Coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">Discussions, study groups and success stories are on the way. We're adding moderation and safety tools first so the community stays helpful and respectful.</p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Safety-first launch</div>
        <Button asChild variant="hero" className="mt-6"><Link to="/mentor">Ask the AI Mentor meanwhile</Link></Button>
      </div>
    </div>
  );
}
