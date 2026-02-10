import { useState, useEffect } from "react";
import { api, type PluginExporterInfo } from "../../api/client.ts";

interface FormatOption {
  id: string;
  name: string;
  ext: string;
  desc: string;
  isPlugin?: boolean;
  pluginName?: string;
}

const BUILT_IN_FORMATS: FormatOption[] = [
  {
    id: "scrivener",
    name: "Scrivener",
    ext: ".scriv",
    desc: "Export as a Scrivener 3 bundle with manuscripts in the Draft folder and entity metadata in Research.",
  },
  {
    id: "plottr",
    name: "Plottr",
    ext: ".pltr",
    desc: "Export as Plottr-compatible JSON. Characters, locations, plotlines, and scene cards mapped from your NovelMap data.",
  },
  {
    id: "json",
    name: "NovelMap JSON",
    ext: ".json",
    desc: "Portable JSON export with all project data. Can be re-imported or consumed by other tools.",
  },
];

function pluginToFormat(p: PluginExporterInfo): FormatOption {
  return {
    id: `plugin:${p.name}`,
    name: p.formatName || p.name,
    ext: p.fileExtension || `.${p.format}`,
    desc: p.description,
    isPlugin: true,
    pluginName: p.name,
  };
}

export function ExportDialog({
  projectId,
  onClose,
}: {
  projectId: number;
  onClose: () => void;
}) {
  const [formats, setFormats] = useState<FormatOption[]>(BUILT_IN_FORMATS);
  const [selected, setSelected] = useState("plottr");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load plugin exporters on mount
  useEffect(() => {
    api.listPluginExporters().then((exporters) => {
      if (exporters.length > 0) {
        setFormats([...BUILT_IN_FORMATS, ...exporters.map(pluginToFormat)]);
      }
    }).catch(() => {
      // Plugins may not be available — that's fine
    });
  }, []);

  async function handleExport() {
    setExporting(true);
    setError(null);

    try {
      const format = formats.find((f) => f.id === selected)!;

      if (format.isPlugin && format.pluginName) {
        // Plugin exporter — fetch via plugin route
        const res = await fetch(
          `/api/projects/${projectId}/plugins/${format.pluginName}/export`
        );
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

        const blob = await res.blob();
        downloadBlob(blob, `export${format.ext}`);
      } else {
        // Built-in exporter
        const url = `/api/projects/${projectId}/export/${selected}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

        const data = await res.json();

        if (selected === "scrivener") {
          downloadJSON(data, `export${format.ext}.json`);
        } else {
          const filename =
            selected === "plottr"
              ? data.file?.fileName ?? `export${format.ext}`
              : `export${format.ext}`;
          downloadJSON(data, filename);
        }
      }

      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const hasPluginFormats = formats.some((f) => f.isPlugin);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[--color-text-primary] mb-4">
          Export Project
        </h2>

        <div className="space-y-2 mb-5">
          {formats.map((fmt, i) => (
            <div key={fmt.id}>
              {/* Divider before plugin formats */}
              {fmt.isPlugin && i > 0 && !formats[i - 1].isPlugin && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-[--color-bg-accent]" />
                  <span className="text-[10px] uppercase tracking-wider text-[--color-text-muted]">
                    Plugin Exporters
                  </span>
                  <div className="flex-1 h-px bg-[--color-bg-accent]" />
                </div>
              )}
              <button
                onClick={() => setSelected(fmt.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selected === fmt.id
                    ? "border-[--color-accent] bg-[--color-accent]/10"
                    : "border-[--color-bg-accent] hover:border-[--color-text-muted]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selected === fmt.id
                        ? "border-[--color-accent]"
                        : "border-[--color-text-muted]"
                    }`}
                  >
                    {selected === fmt.id && (
                      <div className="w-2 h-2 rounded-full bg-[--color-accent]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[--color-text-primary] flex items-center gap-2">
                      {fmt.name}{" "}
                      <span className="text-[--color-text-muted]">
                        ({fmt.ext})
                      </span>
                      {fmt.isPlugin && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#a0c4ff]/15 text-[#a0c4ff]">
                          plugin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[--color-text-secondary] mt-0.5">
                      {fmt.desc}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-[--color-accent] mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-1.5 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
