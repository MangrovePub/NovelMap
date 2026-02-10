import { useRef, useState } from "react";
import { useImportManuscript } from "../../hooks/use-projects.ts";
import type { DetectionSummary, Manuscript } from "../../api/client.ts";

const ACCEPTED = ".md,.docx,.epub,.scriv";

type Step = "select" | "importing" | "done";

interface ImportResult {
  manuscript: Manuscript;
  detection: DetectionSummary;
}

export function ImportDialog({
  projectId,
  onClose,
}: {
  projectId: number;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importMutation = useImportManuscript();

  async function handleFile(file: File) {
    setSelectedFile(file);
    setStep("importing");

    try {
      const data = await importMutation.mutateAsync({ projectId, file });
      setResult(data as unknown as ImportResult);
      setStep("done");
    } catch {
      // Error is in importMutation.error — go back to select
      setStep("select");
      setSelectedFile(null);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[--color-text-primary] mb-4">
          Import Manuscript
        </h2>

        {step === "select" && (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-[--color-accent] bg-[--color-accent]/10"
                  : "border-[--color-bg-accent] hover:border-[--color-text-muted]"
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <svg
                className="w-10 h-10 mx-auto mb-3 text-[--color-text-muted]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="text-sm text-[--color-text-secondary] mb-1">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-[--color-text-muted]">
                Supports .md, .docx, .epub, .scriv
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {importMutation.isError && (
              <div className="mt-3 p-3 rounded-lg bg-[--color-accent]/10 border border-[--color-accent]/30">
                <p className="text-sm text-[--color-accent] font-medium mb-1">
                  Import failed
                </p>
                <p className="text-xs text-[--color-text-secondary]">
                  {(importMutation.error as Error).message}
                </p>
              </div>
            )}
          </>
        )}

        {step === "importing" && selectedFile && (
          <div className="py-6 text-center">
            {/* Spinner */}
            <div className="mx-auto mb-4 w-10 h-10 border-3 border-[--color-bg-accent] border-t-[--color-accent] rounded-full animate-spin" />
            <p className="text-sm font-medium text-[--color-text-primary] mb-1">
              Importing {selectedFile.name}
            </p>
            <p className="text-xs text-[--color-text-muted]">
              {formatSize(selectedFile.size)} — Parsing and detecting entities...
            </p>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            {/* Success header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#45e9a0]/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#45e9a0]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">
                  {result.manuscript.title}
                </p>
                <p className="text-xs text-[--color-text-muted]">
                  Imported successfully
                </p>
              </div>
            </div>

            {/* Detection summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[--color-bg-body]">
                <p className="text-2xl font-bold text-[--color-text-primary]">
                  {result.detection.totalMatches}
                </p>
                <p className="text-xs text-[--color-text-muted]">
                  Entity matches
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[--color-bg-body]">
                <p className="text-2xl font-bold text-[--color-text-primary]">
                  {result.detection.newAppearances}
                </p>
                <p className="text-xs text-[--color-text-muted]">
                  New appearances
                </p>
              </div>
            </div>

            {/* Cross-book entities */}
            {result.detection.crossBookEntities.length > 0 && (
              <div className="p-3 rounded-lg bg-[--color-bg-body]">
                <p className="text-xs font-medium text-[--color-text-secondary] mb-2">
                  Cross-book entities detected
                </p>
                <div className="space-y-1.5">
                  {result.detection.crossBookEntities.slice(0, 5).map((e) => (
                    <div key={e.entityId} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background:
                            e.entityType === "character"
                              ? "#e94560"
                              : e.entityType === "location"
                                ? "#0f3460"
                                : e.entityType === "organization"
                                  ? "#533483"
                                  : "#e9a045",
                        }}
                      />
                      <span className="text-[--color-text-primary] truncate">
                        {e.entityName}
                      </span>
                      <span className="text-[--color-text-muted] ml-auto flex-shrink-0">
                        {e.existingBooks.length + e.newBooks.length} books
                      </span>
                    </div>
                  ))}
                  {result.detection.crossBookEntities.length > 5 && (
                    <p className="text-[--color-text-muted] text-xs">
                      +{result.detection.crossBookEntities.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              step === "done"
                ? "bg-[--color-accent] text-white hover:opacity-90"
                : "text-[--color-text-secondary] hover:text-[--color-text-primary]"
            }`}
          >
            {step === "done" ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
