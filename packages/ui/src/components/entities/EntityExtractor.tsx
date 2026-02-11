import { useState, useEffect } from "react";
import { useProjectStore } from "../../stores/project-store.ts";
import { useExtractEntities, useConfirmExtraction } from "../../hooks/use-entities.ts";
import { EntityTypeBadge } from "../shared/EntityTypeBadge.tsx";
import type { ExtractionCandidate, EntityType } from "../../api/client.ts";

type Step = "scanning" | "review" | "done";

interface SelectedCandidate extends ExtractionCandidate {
  selected: boolean;
  overrideType?: EntityType;
}

export function EntityExtractor({ onClose }: { onClose: () => void }) {
  const { activeProjectId } = useProjectStore();
  const extract = useExtractEntities();
  const confirm = useConfirmExtraction();

  const [step, setStep] = useState<Step>("scanning");
  const [candidates, setCandidates] = useState<SelectedCandidate[]>([]);
  const [existingEntities, setExistingEntities] = useState<string[]>([]);
  const [createdCount, setCreatedCount] = useState(0);
  const [detectionSummary, setDetectionSummary] = useState<string>("");

  useEffect(() => {
    if (!activeProjectId) return;
    extract.mutate(
      { projectId: activeProjectId },
      {
        onSuccess: (result) => {
          const selected = result.candidates.map((c) => ({
            ...c,
            selected: c.confidence !== "low",
          }));
          setCandidates(selected);
          setExistingEntities(result.existingEntities);
          setStep("review");
        },
        onError: () => setStep("review"),
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCandidate(idx: number) {
    setCandidates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c))
    );
  }

  function setType(idx: number, type: EntityType) {
    setCandidates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, overrideType: type } : c))
    );
  }

  function handleConfirm() {
    if (!activeProjectId) return;
    const selected = candidates
      .filter((c) => c.selected)
      .map((c) => ({
        text: c.text,
        type: c.overrideType ?? c.suggestedType,
      }));

    confirm.mutate(
      { projectId: activeProjectId, candidates: selected },
      {
        onSuccess: (result) => {
          setCreatedCount(result.created.length);
          const d = result.detection;
          setDetectionSummary(
            `${d.totalMatches} text matches found, ${d.newAppearances} appearances created.` +
            (d.crossBookEntities.length > 0
              ? ` ${d.crossBookEntities.length} entities appear across multiple books!`
              : "")
          );
          setStep("done");
        },
      }
    );
  }

  const selectedCount = candidates.filter((c) => c.selected).length;

  // Group candidates by type
  const grouped = new Map<EntityType, SelectedCandidate[]>();
  for (const c of candidates) {
    const type = c.overrideType ?? c.suggestedType;
    const list = grouped.get(type) ?? [];
    list.push(c);
    grouped.set(type, list);
  }

  const typeOrder: EntityType[] = ["character", "location", "organization", "artifact", "concept", "event"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--color-bg-accent]">
          <h2 className="text-lg font-bold text-[--color-text-primary]">
            Extract Entities from Text
          </h2>
          <button
            onClick={onClose}
            className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-8 h-8 border-2 border-[--color-accent] border-t-transparent rounded-full animate-spin" />
              <p className="text-[--color-text-secondary]">
                Scanning manuscript text for entity candidates...
              </p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              {candidates.length === 0 ? (
                <div className="text-center py-12 text-[--color-text-muted]">
                  <p className="text-lg mb-2">No candidates found</p>
                  <p className="text-sm">
                    The text didn't contain enough recurring proper nouns to suggest entities.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[--color-text-secondary]">
                    Found {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}.
                    {existingEntities.length > 0 && ` (${existingEntities.length} entities already exist)`}
                  </p>

                  {typeOrder.map((type) => {
                    const items = grouped.get(type);
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={type}>
                        <h3 className="text-sm font-semibold text-[--color-text-primary] mb-2 capitalize flex items-center gap-2">
                          <EntityTypeBadge type={type} />
                          {type}s ({items.length})
                        </h3>
                        <div className="space-y-1">
                          {items.map((c) => {
                            const idx = candidates.indexOf(c);
                            return (
                              <CandidateRow
                                key={c.text}
                                candidate={c}
                                onToggle={() => toggleCandidate(idx)}
                                onTypeChange={(t) => setType(idx, t)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[--color-text-primary]">
                Created {createdCount} entities
              </p>
              {detectionSummary && (
                <p className="text-sm text-[--color-text-secondary] text-center max-w-md">
                  {detectionSummary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[--color-bg-accent]">
          {step === "review" && candidates.length > 0 && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedCount === 0 || confirm.isPending}
                className="px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {confirm.isPending
                  ? "Creating..."
                  : `Create ${selectedCount} Entit${selectedCount === 1 ? "y" : "ies"}`}
              </button>
            </>
          )}
          {(step === "done" || (step === "review" && candidates.length === 0)) && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Candidate Row ────────────────────────────────────────────

const ENTITY_TYPES: EntityType[] = [
  "character", "location", "organization", "artifact", "concept", "event",
];

function CandidateRow({
  candidate,
  onToggle,
  onTypeChange,
}: {
  candidate: SelectedCandidate;
  onToggle: () => void;
  onTypeChange: (type: EntityType) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const confidenceColor =
    candidate.confidence === "high"
      ? "text-green-500"
      : candidate.confidence === "medium"
        ? "text-yellow-500"
        : "text-[--color-text-muted]";

  return (
    <div
      className={`rounded-lg border transition-colors ${
        candidate.selected
          ? "border-[--color-accent]/30 bg-[--color-bg-body]"
          : "border-transparent bg-[--color-bg-body]/50 opacity-50"
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Checkbox */}
        <button onClick={onToggle} className="shrink-0">
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              candidate.selected
                ? "bg-[--color-accent] border-[--color-accent]"
                : "border-[--color-text-muted]"
            }`}
          >
            {candidate.selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
        </button>

        {/* Name */}
        <span className="font-medium text-sm text-[--color-text-primary] min-w-[120px]">
          {candidate.text}
        </span>

        {/* Type select */}
        <select
          value={candidate.overrideType ?? candidate.suggestedType}
          onChange={(e) => onTypeChange(e.target.value as EntityType)}
          className="text-xs bg-[--color-bg-accent] text-[--color-text-secondary] rounded px-2 py-1 border-none"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Stats */}
        <span className="text-xs text-[--color-text-muted] ml-auto">
          {candidate.occurrences} mentions
        </span>
        <span className="text-xs text-[--color-text-muted]">
          {candidate.chapterSpread} ch.
        </span>
        <span className={`text-xs font-medium ${confidenceColor}`}>
          {candidate.confidence}
        </span>

        {/* Expand context */}
        {candidate.sampleContexts.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Context snippets */}
      {expanded && candidate.sampleContexts.length > 0 && (
        <div className="px-10 pb-2 space-y-1">
          {candidate.sampleContexts.map((ctx, i) => (
            <p key={i} className="text-xs text-[--color-text-muted] italic leading-relaxed">
              {ctx}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
