import { useState } from "react";
import { MermaidRenderer } from "./MermaidRenderer.tsx";

const TEMPLATES = {
  storyArc: `graph TD
    A[Exposition] --> B[Rising Action]
    B --> C[Climax]
    C --> D[Falling Action]
    D --> E[Resolution]
    style A fill:#0f3460,stroke:#e94560
    style B fill:#0f3460,stroke:#e94560
    style C fill:#e94560,stroke:#e94560,color:#fff
    style D fill:#0f3460,stroke:#e94560
    style E fill:#0f3460,stroke:#e94560`,
  characterJourney: `graph LR
    A[Ordinary World] --> B[Call to Adventure]
    B --> C[Crossing Threshold]
    C --> D[Tests & Allies]
    D --> E[Ordeal]
    E --> F[Reward]
    F --> G[Return]
    style E fill:#e94560,stroke:#e94560,color:#fff`,
  chapterFlow: `graph TD
    Ch1[Chapter 1: Setup] --> Ch2[Chapter 2: Inciting Incident]
    Ch2 --> Ch3[Chapter 3: First Plot Point]
    Ch3 --> Ch4[Chapter 4: Rising Tension]
    Ch4 --> Ch5[Chapter 5: Midpoint]
    Ch5 --> Ch6[Chapter 6: Complications]
    Ch6 --> Ch7[Chapter 7: Climax]
    Ch7 --> Ch8[Chapter 8: Resolution]`,
};

export function PlotDiagramView() {
  const [code, setCode] = useState(TEMPLATES.storyArc);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Plot Diagrams
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[--color-text-muted]">Templates:</span>
          <button
            onClick={() => setCode(TEMPLATES.storyArc)}
            className="px-2.5 py-1 text-xs rounded-md bg-[--color-bg-card] border border-[--color-bg-accent] text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
          >
            Story Arc
          </button>
          <button
            onClick={() => setCode(TEMPLATES.characterJourney)}
            className="px-2.5 py-1 text-xs rounded-md bg-[--color-bg-card] border border-[--color-bg-accent] text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
          >
            Hero's Journey
          </button>
          <button
            onClick={() => setCode(TEMPLATES.chapterFlow)}
            className="px-2.5 py-1 text-xs rounded-md bg-[--color-bg-card] border border-[--color-bg-accent] text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
          >
            Chapter Flow
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Editor */}
        <div className="flex flex-col rounded-xl border border-[--color-bg-accent] overflow-hidden">
          <div className="px-4 py-2 bg-[--color-bg-card] border-b border-[--color-bg-accent] text-xs text-[--color-text-muted]">
            Mermaid Editor
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-[--color-bg-body] text-[--color-text-primary] p-4 text-sm font-mono resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className="flex flex-col rounded-xl border border-[--color-bg-accent] overflow-hidden">
          <div className="px-4 py-2 bg-[--color-bg-card] border-b border-[--color-bg-accent] text-xs text-[--color-text-muted]">
            Preview
          </div>
          <div className="flex-1 bg-[--color-bg-body] p-4 overflow-auto">
            <MermaidRenderer code={code} />
          </div>
        </div>
      </div>
    </div>
  );
}
