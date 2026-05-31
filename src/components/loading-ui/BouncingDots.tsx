type BouncingDotsProps = {
  className?: string;
  dotCount?: number;
  duration?: string;
  label?: string;
};

export function BouncingDots({
  className = "",
  dotCount = 3,
  duration = "1.4s",
  label = "Loading",
}: BouncingDotsProps) {
  const safeDotCount = Math.max(1, Math.min(dotCount, 6));

  return (
    <span
      aria-label={label}
      className={`inline-flex items-center gap-1.5 text-current ${className}`}
      role="status"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: safeDotCount }).map((_, index) => (
        <span
          aria-hidden="true"
          className="ops-bouncing-dot h-2 w-2 rounded-full bg-current"
          key={index}
          style={{
            animationDelay: `${(index * 0.16).toFixed(2)}s`,
            animationDuration: duration,
          }}
        />
      ))}
    </span>
  );
}
