export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 select-none sm:gap-2.5 ${className ?? ""}`}>
      <div className="flex size-7 shrink-0 items-center justify-center bg-foreground sm:size-8">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 20V4H8L12 10L16 4H20V20"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
            className="text-background"
          />
        </svg>
      </div>
      <span
        className="flex items-baseline truncate text-base tracking-[-0.04em] sm:text-xl"
        style={{ fontFamily: "'Inter', var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
      >
        <span className="font-light text-muted-foreground">MY</span>
        <span className="mx-1 font-bold text-foreground">SALON</span>
        <span className="font-light text-muted-foreground">RENTERS</span>
      </span>
    </div>
  );
}
