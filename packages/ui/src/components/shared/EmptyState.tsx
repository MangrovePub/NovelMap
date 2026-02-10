export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[--color-bg-accent] flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-[--color-text-muted]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-17.5 0a2.25 2.25 0 0 0-2.25 2.249v3.001a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25v-3a2.25 2.25 0 0 0-2.25-2.25m-17.5 0V6.999a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v6.501"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-[--color-text-primary] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[--color-text-muted] max-w-sm">{description}</p>
    </div>
  );
}
