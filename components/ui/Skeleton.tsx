interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export const SkeletonCard = ({
  lines = 2,
  className = "",
}: SkeletonCardProps) => (
  <div
    className={`rounded-xl border border-border bg-surface p-4 ${className}`}
    aria-busy="true"
    aria-label="Loading…"
  >
    <div className="animate-shimmer h-7 w-16 rounded-md mb-2" />
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="animate-shimmer mt-2 h-4 rounded-md"
        style={{ width: i === 0 ? "60%" : "40%" }}
      />
    ))}
  </div>
);

export const SkeletonText = ({ width = "w-32" }: { width?: string }) => (
  <div className={`animate-shimmer h-4 rounded-md ${width}`} />
);

export const SkeletonAvatar = ({ size = 10 }: { size?: number }) => (
  <div
    className="animate-shimmer rounded-full flex-shrink-0"
    style={{ width: size * 4, height: size * 4 }}
  />
);
