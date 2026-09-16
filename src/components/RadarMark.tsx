export default function RadarMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeOpacity="0.28" />
      <circle cx="16" cy="16" r="3" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      <line x1="16" y1="3" x2="16" y2="29" stroke="currentColor" strokeOpacity="0.2" />
      <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeOpacity="0.2" />
      <path className="radar-sweep" d="M16 16 L16 4 A12 12 0 0 1 26.4 10 Z" fill="currentColor" fillOpacity="0.22" />
    </svg>
  );
}
