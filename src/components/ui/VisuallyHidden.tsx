import type { ReactNode } from 'react';

/** Teks hanya untuk pembaca layar; tetap dapat difokus dan tidak menambah layout. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span className="absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]">
      {children}
    </span>
  );
}
