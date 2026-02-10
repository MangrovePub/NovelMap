import { useState } from "react";
import { usePlugins, usePluginExporters, usePluginViews, useReloadPlugins, useRunPluginAnalyzer } from "../../hooks/use-plugins.ts";
import { useProjectStore } from "../../stores/project-store.ts";
import type { PluginInfo, PluginViewInfo } from "../../api/client.ts";

const capabilityColors: Record<string, string> = {
  analyzer: "bg-[#45e9a0]/20 text-[#45e9a0]",
  exporter: "bg-[#a0c4ff]/20 text-[#a0c4ff]",
  importer: "bg-[#e9a045]/20 text-[#e9a045]",
  view: "bg-[#e94560]/20 text-[#e94560]",
};

function CapabilityBadge({ cap }: { cap: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${capabilityColors[cap] ?? "bg-white/10 text-[--color-text-secondary]"}`}>
      {cap}
    </span>
  );
}

function PluginCard({
  plugin,
  onRunAnalyzer,
  analyzerRunning,
}: {
  plugin: PluginInfo;
  onRunAnalyzer: (name: string) => void;
  analyzerRunning: boolean;
}) {
  return (
    <div className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[--color-text-primary] truncate">
            {plugin.name}
          </h3>
          <p className="text-sm text-[--color-text-secondary] mt-1">
            {plugin.description}
          </p>
        </div>
        <span className="text-xs text-[--color-text-muted] whitespace-nowrap">
          v{plugin.version}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {plugin.capabilities.map((cap) => (
          <CapabilityBadge key={cap} cap={cap} />
        ))}
      </div>

      {plugin.capabilities.includes("analyzer") && (
        <button
          onClick={() => onRunAnalyzer(plugin.name)}
          disabled={analyzerRunning}
          className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#45e9a0]/20 text-[#45e9a0] hover:bg-[#45e9a0]/30 transition-colors disabled:opacity-50"
        >
          {analyzerRunning ? "Running..." : "Run Analyzer"}
        </button>
      )}
    </div>
  );
}

function PluginViewsSection({ views }: { views: PluginViewInfo[] }) {
  const projectId = useProjectStore((s) => s.activeProjectId);
  const [activeView, setActiveView] = useState<string | null>(null);

  if (!projectId) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[--color-text-secondary] uppercase tracking-wider">
        Custom Views
      </h2>
      <div className="flex gap-2 flex-wrap">
        {views.map((v) => (
          <button
            key={v.name}
            onClick={() => setActiveView(activeView === v.name ? null : v.name)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeView === v.name
                ? "bg-[--color-accent] text-white"
                : "bg-[--color-bg-accent] text-[--color-text-secondary] hover:text-[--color-text-primary]"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {activeView && (
        <div className="rounded-xl border border-[--color-bg-accent] overflow-hidden">
          <iframe
            src={`/api/projects/${projectId}/plugins/${activeView}/view`}
            title={`Plugin view: ${activeView}`}
            className="w-full border-0"
            style={{ height: "500px", background: "#1a1a2e" }}
          />
        </div>
      )}
    </div>
  );
}

export function PluginsView() {
  const { data: plugins, isLoading } = usePlugins();
  const { data: exporters } = usePluginExporters();
  const { data: views } = usePluginViews();
  const reload = useReloadPlugins();
  const runAnalyzer = useRunPluginAnalyzer();
  const [analyzerResult, setAnalyzerResult] = useState<{
    title: string;
    summary: string;
    data: Record<string, unknown>;
  } | null>(null);

  const handleRunAnalyzer = (name: string) => {
    setAnalyzerResult(null);
    runAnalyzer.mutate(name, {
      onSuccess: (result) => setAnalyzerResult(result),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-text-muted]">
        Loading plugins...
      </div>
    );
  }

  const installedCount = plugins?.length ?? 0;
  const exporterCount = exporters?.length ?? 0;
  const viewCount = views?.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">Plugins</h1>
          <p className="text-sm text-[--color-text-secondary] mt-1">
            Extend NovelMap with community plugins — analyzers, exporters, importers, and custom views.
          </p>
        </div>
        <button
          onClick={() => reload.mutate()}
          disabled={reload.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[--color-bg-accent] text-[--color-text-primary] hover:bg-[--color-accent]/20 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          {reload.isPending ? "Reloading..." : "Reload Plugins"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-4 text-center">
          <div className="text-2xl font-bold text-[--color-accent]">{installedCount}</div>
          <div className="text-xs text-[--color-text-secondary] mt-1">Installed</div>
        </div>
        <div className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-4 text-center">
          <div className="text-2xl font-bold text-[#a0c4ff]">{exporterCount}</div>
          <div className="text-xs text-[--color-text-secondary] mt-1">Exporters</div>
        </div>
        <div className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-4 text-center">
          <div className="text-2xl font-bold text-[#e94560]">{viewCount}</div>
          <div className="text-xs text-[--color-text-secondary] mt-1">Custom Views</div>
        </div>
      </div>

      {/* Plugin Cards */}
      {installedCount === 0 ? (
        <div className="rounded-xl border border-dashed border-[--color-bg-accent] bg-[--color-bg-card] p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-[--color-text-muted] mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
          </svg>
          <h3 className="text-lg font-semibold text-[--color-text-primary] mb-2">No plugins installed</h3>
          <p className="text-sm text-[--color-text-secondary] max-w-md mx-auto">
            Copy plugin folders to <code className="text-[#a0c4ff] bg-[--color-bg-accent] px-1.5 py-0.5 rounded text-xs">~/.novelmap/plugins/</code> and
            click Reload Plugins to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plugins!.map((plugin) => (
            <PluginCard
              key={plugin.name}
              plugin={plugin}
              onRunAnalyzer={handleRunAnalyzer}
              analyzerRunning={runAnalyzer.isPending}
            />
          ))}
        </div>
      )}

      {/* Analyzer Result */}
      {analyzerResult && (
        <div className="rounded-xl border border-[#45e9a0]/30 bg-[#45e9a0]/5 p-5">
          <h3 className="text-base font-semibold text-[#45e9a0] mb-1">{analyzerResult.title}</h3>
          <p className="text-sm text-[--color-text-secondary] mb-3">{analyzerResult.summary}</p>
          <pre className="text-xs text-[--color-text-muted] bg-[--color-bg-body] rounded-lg p-4 overflow-auto max-h-64">
            {JSON.stringify(analyzerResult.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Plugin Views */}
      {views && views.length > 0 && <PluginViewsSection views={views} />}

      {/* Plugin Development Guide */}
      <div className="rounded-xl border border-[--color-bg-accent] bg-[--color-bg-card] p-5">
        <h3 className="text-base font-semibold text-[--color-text-primary] mb-2">Create Your Own Plugin</h3>
        <p className="text-sm text-[--color-text-secondary] mb-3">
          NovelMap plugins are simple JavaScript modules. Create a folder in <code className="text-[#a0c4ff] bg-[--color-bg-accent] px-1.5 py-0.5 rounded text-xs">~/.novelmap/plugins/</code> with
          a <code className="text-[#a0c4ff] bg-[--color-bg-accent] px-1.5 py-0.5 rounded text-xs">novelmap-plugin.json</code> manifest and an entry module.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
          {[
            { cap: "importer", desc: "Parse new file formats" },
            { cap: "exporter", desc: "Export to new formats" },
            { cap: "analyzer", desc: "Compute derived insights" },
            { cap: "view", desc: "Custom visualizations" },
          ].map(({ cap, desc }) => (
            <div key={cap} className="rounded-lg bg-[--color-bg-body] p-3">
              <CapabilityBadge cap={cap} />
              <div className="text-[--color-text-muted] mt-2">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
