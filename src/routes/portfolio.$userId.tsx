import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portfolio/$userId")({
  head: () => ({
    meta: [
      { title: "Portfolio — AppendUs" },
      { name: "description", content: "A public project portfolio built with AppendUs." },
      { property: "og:title", content: "Portfolio — AppendUs" },
      { property: "og:description", content: "A public project portfolio built with AppendUs." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { userId } = Route.useParams();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["public-portfolio", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,description,tech,link,status,created_at")
        .eq("user_id", userId)
        .eq("visibility", "public")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="hero" size="sm"><Link to="/auth" search={{ mode: "signup" }}>Build your own</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><FolderKanban className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold">Project Portfolio</h1>
            <p className="text-sm text-muted-foreground">Public projects shared by this AppendUs member</p>
          </div>
        </div>
        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && projects.length === 0 && (
          <div className="surface mt-10 p-8 text-center text-sm text-muted-foreground">This portfolio has no public projects yet.</div>
        )}
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="surface flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{p.title}</p>
                <Badge variant="secondary" className={p.status === "done" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}>{p.status === "done" ? "Completed" : "In progress"}</Badge>
              </div>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
              {p.tech && <p className="mt-2 text-xs text-muted-foreground">{p.tech}</p>}
              {p.link && (
                <Button size="sm" variant="outline" className="mt-4 self-start" asChild>
                  <a href={p.link} target="_blank" rel="noreferrer"><ExternalLink /> View project</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">Built with AppendUs</footer>
    </div>
  );
}
