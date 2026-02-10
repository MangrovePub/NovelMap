import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "#1a1a2e",
    primaryColor: "#0f3460",
    primaryTextColor: "#e0e0e0",
    primaryBorderColor: "#0f3460",
    lineColor: "#555",
    secondaryColor: "#533483",
    tertiaryColor: "#16213e",
  },
});

let renderCounter = 0;

export function MermaidRenderer({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !code.trim()) return;

    const id = `mermaid-${++renderCounter}`;
    let cancelled = false;

    (async () => {
      try {
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="text-sm text-[--color-accent] p-2">
        Syntax error: {error}
      </div>
    );
  }

  return <div ref={containerRef} className="flex items-center justify-center" />;
}
