// Ukuran memakai kelas token, bukan style inline, agar check-tokens tetap hijau
// dan proporsi konsisten dengan tipografi (§17.2).
const SIZES = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-8',
} as const;

export type SpinnerSize = keyof typeof SIZES;

export function Spinner({ size = 'md', label }: { size?: SpinnerSize; label?: string }) {
  return (
    <span
      // Decorative by default; named when it carries the only status message.
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block animate-spin motion-reduce:animate-none ${SIZES[size]}`}
    >
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
