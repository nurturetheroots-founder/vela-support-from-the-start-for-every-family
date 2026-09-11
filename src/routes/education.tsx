import { empty } from "@/lib/microcopy";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { educationModules, EducationModule } from "@/lib/education";
import { getState, markModuleComplete, toggleBookmark, useStore, weekNumber } from "@/lib/store";
import { Bookmark, BookmarkCheck, Check, Search, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/education")({
  head: () => ({ meta: [{ title: "Learning — Vela" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getState().profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: EducationPage,
});

type SortOption = "relevance" | "week-asc" | "week-desc" | "time-asc" | "time-desc";

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 2);
}

function scoreRelevance(module: EducationModule, query: string): number {
  const raw = query.trim().toLowerCase();
  const keywords = tokenize(query);
  if (!raw || keywords.length === 0) return 0;

  const title = module.title.toLowerCase();
  const excerpt = module.excerpt.toLowerCase();
  const tagText = module.tags.join(" ").toLowerCase();
  const bodyText = module.body.join(" ").toLowerCase();

  let score = 0;

  // Exact phrase matches (full query as typed)
  if (title.includes(raw)) score += 10;
  if (excerpt.includes(raw)) score += 5;
  if (tagText.includes(raw)) score += 5;
  if (bodyText.includes(raw)) score += 2;

  for (const kw of keywords) {
    const inTitle = title.includes(kw);
    const inExcerpt = excerpt.includes(kw);
    const inTags = tagText.includes(kw);
    const inBody = bodyText.includes(kw);

    if (inTitle) score += 3;
    if (inExcerpt) score += 2;
    if (inTags) score += 2;
    if (inBody) score += 1;

    // Word-boundary bonus: keyword appears as a whole word
    const boundary = new RegExp("\\b" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (boundary.test(module.title)) score += 2;
    if (boundary.test(module.excerpt)) score += 1;
  }

  // Coverage bonus: more distinct keywords matched = higher relevance
  const matched = keywords.filter(
    (kw) =>
      title.includes(kw) || excerpt.includes(kw) || tagText.includes(kw) || bodyText.includes(kw),
  ).length;
  score += matched * 2;

  return score;
}

function EducationPage() {
  const profile = useStore((s) => s.profile);
  const { week } = weekNumber(profile);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("week-asc");

  const mvpModules = educationModules.filter((m) => m.week >= 1 && m.week <= 6);
  const allTags = Array.from(new Set(mvpModules.flatMap((m) => m.tags)));

  const visibleModules = useMemo(() => {
    let result = mvpModules;

    if (activeTag) {
      result = result.filter((m) => m.tags.includes(activeTag));
    }

    if (searchQuery.trim()) {
      const keywords = tokenize(searchQuery);
      if (keywords.length > 0) {
        result = result.filter((m) => {
          const hay =
            `${m.title} ${m.excerpt} ${m.tags.join(" ")} ${m.body.join(" ")}`.toLowerCase();
          return keywords.some((kw) => hay.includes(kw));
        });
      }
    }

    const sorter = [...result];
    switch (sortBy) {
      case "relevance":
        if (searchQuery.trim()) {
          sorter.sort((a, b) => {
            const sa = scoreRelevance(a, searchQuery.trim());
            const sb = scoreRelevance(b, searchQuery.trim());
            if (sb !== sa) return sb - sa;
            return a.week - b.week;
          });
        } else {
          sorter.sort((a, b) => a.week - b.week);
        }
        break;
      case "week-desc":
        sorter.sort((a, b) => b.week - a.week);
        break;
      case "time-asc":
        sorter.sort((a, b) => a.readTime - b.readTime);
        break;
      case "time-desc":
        sorter.sort((a, b) => b.readTime - a.readTime);
        break;
      default:
        sorter.sort((a, b) => a.week - b.week);
    }

    return sorter;
  }, [mvpModules, activeTag, searchQuery, sortBy]);

  const completedInScope = mvpModules.filter((m) =>
    profile.completedModules.includes(m.week),
  ).length;
  const open = mvpModules.find((m) => m.week === openWeek);

  if (open) {
    const isBookmarked = profile.bookmarks.includes(open.week);
    const isComplete = profile.completedModules.includes(open.week);
    return (
      <AppShell>
        <button
          onClick={() => setOpenWeek(null)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to all guides
        </button>
        <p className="text-xs uppercase tracking-wider text-primary mt-5">
          Week {open.week} · {open.readTime} min read
        </p>
        <h1 className="font-serif text-3xl mt-2 leading-snug">{open.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {open.tags.map((t) => (
            <span
              key={t}
              className="text-xs rounded-full bg-secondary px-2.5 py-1 text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-8 space-y-5 text-[15px] leading-[1.8] max-w-prose">
          {open.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button
            onClick={() => markModuleComplete(open.week)}
            className="rounded-full"
            disabled={isComplete}
          >
            {isComplete ? (
              <>
                <Check className="h-4 w-4" /> Completed
              </>
            ) : (
              "Mark as read"
            )}
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => toggleBookmark(open.week)}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" /> Save
              </>
            )}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-serif text-3xl">Weekly guides</h1>
      <p className="mt-2 text-muted-foreground">
        Short reads that meet you where your week is. Take them in any order, or skip one entirely —
        nothing here is homework.
      </p>
      <div className="mt-5 text-sm text-muted-foreground">
        {completedInScope} of {mvpModules.length} weeks read
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(completedInScope / mvpModules.length) * 100}%` }}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by topic, feeling, or week"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-40 rounded-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week-asc">Week: earliest</SelectItem>
              <SelectItem value="week-desc">Week: latest</SelectItem>
              <SelectItem value="time-asc">Time: shortest</SelectItem>
              <SelectItem value="time-desc">Time: longest</SelectItem>
              <SelectItem value="relevance">Relevance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTag(null)}
          className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
            activeTag === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border/60 hover:border-primary/40"
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
              activeTag === tag
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/60 hover:border-primary/40"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <ul className="mt-8 space-y-3">
        {visibleModules.map((m) => {
          const isCurrent = m.week === Math.min(Math.max(week, 1), 6);
          const isComplete = profile.completedModules.includes(m.week);
          const isBookmarked = profile.bookmarks.includes(m.week);
          return (
            <li key={m.id}>
              <button
                onClick={() => setOpenWeek(m.week)}
                className="w-full text-left rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
                  Week {m.week}
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5">This week</span>
                  )}
                  {isComplete && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground normal-case tracking-normal">
                      Read
                    </span>
                  )}
                  {isBookmarked && (
                    <BookmarkCheck className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  )}
                </div>
                <h2 className="font-serif text-lg mt-1.5">{m.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{m.excerpt}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {m.readTime} min · {m.tags.join(" · ")}
                </p>
              </button>
            </li>
          );
        })}
        {visibleModules.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            {empty.noGuideMatches}
          </li>
        )}
      </ul>
      <p className="mt-8 text-xs text-muted-foreground text-center">Weeks 7–16 unlock as you go.</p>
    </AppShell>
  );
}
