import { useState } from "react";
import { useProjectStore } from "../../stores/project-store.ts";
import { useProjectGenre, useCharacterRoles } from "../../hooks/use-analyzers.ts";
import { EntityTypeBadge } from "../shared/EntityTypeBadge.tsx";
import type { CharacterRole } from "../../api/client.ts";

const ROLE_COLORS: Record<CharacterRole, string> = {
  protagonist: "#e94560",
  deuteragonist: "#a0c4ff",
  antagonist: "#e9a045",
  supporting: "#45e9a0",
  minor: "#888",
  mentioned: "#555",
};

const ROLE_LABELS: Record<CharacterRole, string> = {
  protagonist: "Protagonist",
  deuteragonist: "Deuteragonist",
  antagonist: "Antagonist",
  supporting: "Supporting",
  minor: "Minor",
  mentioned: "Mentioned",
};

export function InsightsView() {
  const { activeProjectId } = useProjectStore();
  const { data: genre, isLoading: genreLoading } = useProjectGenre(activeProjectId);
  const { data: roles, isLoading: rolesLoading } = useCharacterRoles(activeProjectId);
  const [activeTab, setActiveTab] = useState<"genre" | "roles" | "bible">("genre");

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        Select a project to view insights.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Insights
        </h1>
        <a
          href={`/api/projects/${activeProjectId}/bible/html`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          Open Series Bible
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[--color-bg-accent]">
        {([
          { id: "genre" as const, label: "Genre Analysis" },
          { id: "roles" as const, label: "Character Roles" },
          { id: "bible" as const, label: "Series Bible" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[--color-accent] text-[--color-accent]"
                : "border-transparent text-[--color-text-secondary] hover:text-[--color-text-primary]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Genre Tab */}
      {activeTab === "genre" && (
        <GenreTab data={genre} loading={genreLoading} />
      )}

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <RolesTab data={roles} loading={rolesLoading} />
      )}

      {/* Bible Tab */}
      {activeTab === "bible" && (
        <BibleTab projectId={activeProjectId} />
      )}
    </div>
  );
}

function GenreTab({ data, loading }: { data: ReturnType<typeof useProjectGenre>["data"]; loading: boolean }) {
  if (loading) return <Loading />;
  if (!data || data.manuscripts.length === 0) {
    return <Empty message="Import manuscripts to analyze genre." />;
  }

  return (
    <div className="space-y-6">
      {/* Series-level genre */}
      <div className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-[--color-accent]">
            {data.seriesGenre}
          </h2>
          <span className="text-sm text-[--color-text-muted]">
            Primary Series Genre
          </span>
        </div>
        <p className="text-sm text-[--color-text-secondary] mb-4">
          {data.genreConsistency}
        </p>

        {data.recurringThemes.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-[--color-text-muted] uppercase tracking-wider mb-2">
              Recurring Themes
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.recurringThemes.map((theme) => (
                <span
                  key={theme}
                  className="px-3 py-1 bg-[--color-bg-accent] text-[--color-link] rounded-full text-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Per-manuscript breakdown */}
      {data.manuscripts.map((ms) => (
        <div
          key={ms.manuscriptId}
          className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[--color-text-primary]">
              {ms.manuscriptTitle}
            </h3>
            <span className="text-xs text-[--color-text-muted]">
              {ms.wordCount.toLocaleString()} words
            </span>
          </div>

          {/* Genre bars */}
          <div className="space-y-2 mb-4">
            {ms.genres.map((g) => (
              <div key={g.genre} className="flex items-center gap-3">
                <span className="w-32 text-sm text-[--color-text-secondary] text-right shrink-0">
                  {g.genre}
                </span>
                <div className="flex-1 bg-[--color-bg-body] rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[--color-accent] transition-all"
                    style={{ width: `${Math.round(g.confidence * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-xs text-[--color-text-muted] text-right">
                  {Math.round(g.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>

          {/* Sub-genres */}
          {ms.genres.some((g) => g.subGenres.length > 0) && (
            <div className="mb-3">
              <span className="text-xs text-[--color-text-muted]">Sub-genres: </span>
              {ms.genres
                .flatMap((g) => g.subGenres)
                .map((sub, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 bg-[--color-bg-accent] text-[--color-text-secondary] rounded text-xs mr-1 mb-1"
                  >
                    {sub}
                  </span>
                ))}
            </div>
          )}

          {/* Themes */}
          {ms.themes.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-[--color-text-muted]">Themes: </span>
              {ms.themes.map((t) => (
                <span
                  key={t}
                  className="inline-block px-2 py-0.5 bg-[#0f3460]/50 text-[--color-link] rounded text-xs mr-1 mb-1"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Marker words */}
          {ms.genres.length > 0 && ms.genres[0].markers.length > 0 && (
            <div>
              <span className="text-xs text-[--color-text-muted]">
                Key markers:{" "}
              </span>
              <span className="text-xs text-[--color-text-secondary]">
                {ms.genres[0].markers.slice(0, 8).join(", ")}
              </span>
            </div>
          )}

          {/* BISAC categories */}
          {ms.suggestedCategories.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[--color-bg-accent]">
              <span className="text-xs text-[--color-text-muted] uppercase tracking-wider">
                Suggested Categories
              </span>
              <ul className="mt-1">
                {ms.suggestedCategories.map((cat, i) => (
                  <li key={i} className="text-sm text-[--color-text-secondary]">
                    {cat}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RolesTab({ data, loading }: { data: ReturnType<typeof useCharacterRoles>["data"]; loading: boolean }) {
  if (loading) return <Loading />;
  if (!data || data.characters.length === 0) {
    return <Empty message="Import manuscripts and create character entities to analyze roles." />;
  }

  // Group by role
  const grouped = new Map<CharacterRole, typeof data.characters>();
  for (const char of data.characters) {
    if (!grouped.has(char.role)) grouped.set(char.role, []);
    grouped.get(char.role)!.push(char);
  }

  const roleOrder: CharacterRole[] = [
    "protagonist", "deuteragonist", "antagonist", "supporting", "minor", "mentioned",
  ];

  return (
    <div className="space-y-6">
      {/* Role summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {roleOrder.map((role) => {
          const count = grouped.get(role)?.length ?? 0;
          return (
            <div
              key={role}
              className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-3 text-center"
            >
              <div
                className="text-2xl font-bold"
                style={{ color: ROLE_COLORS[role] }}
              >
                {count}
              </div>
              <div className="text-xs text-[--color-text-muted] capitalize">
                {ROLE_LABELS[role]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role shifts across books */}
      {data.roleShifts.length > 0 && (
        <div className="bg-[#e9a045]/10 border border-[#e9a045]/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#e9a045] mb-2">
            Role Shifts Across Books
          </h3>
          <div className="space-y-2">
            {data.roleShifts.map((rs) => (
              <div key={rs.entityId} className="text-sm">
                <span className="font-medium text-[--color-text-primary]">
                  {rs.entityName}
                </span>
                <span className="text-[--color-text-muted]">: </span>
                {rs.shifts.map((s, i) => (
                  <span key={i}>
                    {i > 0 && (
                      <span className="text-[--color-text-muted] mx-1">&rarr;</span>
                    )}
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: ROLE_COLORS[s.role] + "22",
                        color: ROLE_COLORS[s.role],
                      }}
                    >
                      {s.role}
                    </span>
                    <span className="text-xs text-[--color-text-muted] ml-1">
                      ({s.manuscriptTitle})
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character cards by role */}
      {roleOrder.map((role) => {
        const chars = grouped.get(role);
        if (!chars?.length) return null;
        return (
          <div key={role}>
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: ROLE_COLORS[role] }}
            >
              {ROLE_LABELS[role]}s ({chars.length})
            </h3>
            <div className="grid gap-3">
              {chars.map((char) => (
                <div
                  key={char.entityId}
                  className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ROLE_COLORS[char.role] }}
                    />
                    <h4 className="font-semibold text-[--color-text-primary]">
                      {char.entityName}
                    </h4>
                    <span
                      className="px-2 py-0.5 rounded text-xs capitalize"
                      style={{
                        backgroundColor: ROLE_COLORS[char.role] + "22",
                        color: ROLE_COLORS[char.role],
                      }}
                    >
                      {char.role}
                    </span>
                    <span className="text-xs text-[--color-text-muted] ml-auto">
                      {Math.round(char.confidence * 100)}% confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center mb-3">
                    <div>
                      <div className="text-lg font-bold text-[--color-text-primary]">
                        {Math.round(char.presenceRatio * 100)}%
                      </div>
                      <div className="text-xs text-[--color-text-muted]">
                        Chapter Presence
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[--color-text-primary]">
                        {char.peakAct}
                      </div>
                      <div className="text-xs text-[--color-text-muted]">
                        Peak Act
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[--color-text-primary]">
                        {char.perManuscript.length}
                      </div>
                      <div className="text-xs text-[--color-text-muted]">
                        Books
                      </div>
                    </div>
                  </div>

                  {/* Per-manuscript presence bars */}
                  {char.perManuscript.length > 0 && (
                    <div className="space-y-1.5">
                      {char.perManuscript.map((pm) => (
                        <div key={pm.manuscriptId} className="flex items-center gap-2">
                          <span className="w-40 text-xs text-[--color-text-secondary] truncate text-right shrink-0">
                            {pm.manuscriptTitle}
                          </span>
                          <div className="flex-1 bg-[--color-bg-body] rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((pm.chapterAppearances / Math.max(pm.totalChapters, 1)) * 100)}%`,
                                backgroundColor: ROLE_COLORS[pm.role],
                              }}
                            />
                          </div>
                          <span className="w-16 text-xs text-[--color-text-muted] text-right">
                            {pm.chapterAppearances}/{pm.totalChapters} ch.
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Antagonist signals */}
                  {char.antagonistSignals.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[--color-bg-accent]">
                      <span className="text-xs text-[--color-text-muted]">
                        Antagonist signals:{" "}
                      </span>
                      <span className="text-xs text-[#e9a045]">
                        {char.antagonistSignals.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BibleTab({ projectId }: { projectId: number }) {
  return (
    <div className="space-y-6">
      <div className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-6 text-center">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-[--color-accent]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
        <h2 className="text-xl font-bold text-[--color-text-primary] mb-2">
          Series Bible
        </h2>
        <p className="text-sm text-[--color-text-secondary] mb-6 max-w-md mx-auto">
          Generate a comprehensive, beautifully formatted document containing
          everything NovelMap knows about your series: characters (with roles
          and arcs), locations, organizations, relationships, genre analysis,
          and cross-book presence.
        </p>

        <div className="flex items-center justify-center gap-4">
          <a
            href={`/api/projects/${projectId}/bible/html`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Open as HTML
          </a>
          <button
            onClick={async () => {
              const res = await fetch(`/api/projects/${projectId}/bible`);
              const data = await res.json();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${data.projectName ?? "series"}-bible.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[--color-bg-accent] text-[--color-text-primary] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download JSON
          </button>
        </div>

        <div className="mt-8 text-left max-w-lg mx-auto">
          <h3 className="text-sm font-semibold text-[--color-text-secondary] mb-3">
            Includes:
          </h3>
          <ul className="space-y-2">
            {[
              "Series overview with word counts and stats",
              "Genre analysis with BISAC category suggestions",
              "Character dossiers with auto-classified roles",
              "Locations, organizations, and artifacts",
              "Cross-book presence matrix",
              "All relationships mapped",
              "Recurring themes across the series",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
                <svg className="w-4 h-4 text-[#45e9a0] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
      Analyzing...
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-[--color-text-muted]">
      {message}
    </div>
  );
}
