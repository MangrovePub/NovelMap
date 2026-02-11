import { useRef, useState } from "react";
import { useUploadCover, useSetCoverUrl, useDeleteCover } from "../../hooks/use-projects.ts";
import { resolveCoverUrl } from "../../api/client.ts";

const ACCEPTED = ".jpg,.jpeg,.png,.webp";

type Tab = "upload" | "url";

export function CoverDialog({
  manuscriptId,
  currentCoverUrl,
  onClose,
}: {
  manuscriptId: number;
  currentCoverUrl: string | null;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("upload");
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const uploadMutation = useUploadCover();
  const setUrlMutation = useSetCoverUrl();
  const deleteMutation = useDeleteCover();

  async function handleFile(file: File) {
    await uploadMutation.mutateAsync({ manuscriptId, file });
    onClose();
  }

  async function handleUrl() {
    if (!urlInput.trim()) return;
    await setUrlMutation.mutateAsync({ manuscriptId, url: urlInput.trim() });
    onClose();
  }

  async function handleRemove() {
    await deleteMutation.mutateAsync(manuscriptId);
    onClose();
  }

  const isPending = uploadMutation.isPending || setUrlMutation.isPending || deleteMutation.isPending;
  const error = uploadMutation.error || setUrlMutation.error || deleteMutation.error;
  const resolvedUrl = resolveCoverUrl(currentCoverUrl);

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
          Book Cover
        </h2>

        {/* Current cover preview */}
        {resolvedUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-[--color-bg-accent]">
            <img
              src={resolvedUrl}
              alt="Current cover"
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 mb-4 p-1 bg-[--color-bg-body] rounded-lg">
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === "upload"
                ? "bg-[--color-bg-card] text-[--color-text-primary] shadow-sm"
                : "text-[--color-text-muted] hover:text-[--color-text-secondary]"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === "url"
                ? "bg-[--color-bg-card] text-[--color-text-primary] shadow-sm"
                : "text-[--color-text-muted] hover:text-[--color-text-secondary]"
            }`}
          >
            URL
          </button>
        </div>

        {tab === "upload" && (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
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
                className="w-8 h-8 mx-auto mb-2 text-[--color-text-muted]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              <p className="text-sm text-[--color-text-secondary] mb-1">
                Drop a wrap image or click to browse
              </p>
              <p className="text-xs text-[--color-text-muted]">
                JPG, PNG, or WebP — back + spine + front
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
          </>
        )}

        {tab === "url" && (
          <div className="space-y-3">
            <input
              type="url"
              placeholder="https://example.com/cover.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-3 py-2 bg-[--color-bg-body] border border-[--color-bg-accent] rounded-lg text-sm text-[--color-text-primary] placeholder-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
            />
            <button
              onClick={handleUrl}
              disabled={!urlInput.trim() || isPending}
              className="w-full px-4 py-2 bg-[--color-accent] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Set Cover URL
            </button>
          </div>
        )}

        {isPending && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[--color-text-secondary]">
            <div className="w-4 h-4 border-2 border-[--color-bg-accent] border-t-[--color-accent] rounded-full animate-spin" />
            Saving...
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-[--color-accent] text-center">
            {(error as Error).message}
          </p>
        )}

        <div className="mt-4 flex justify-between">
          {currentCoverUrl ? (
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="px-3 py-1.5 text-sm text-[--color-accent] hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              Remove Cover
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
