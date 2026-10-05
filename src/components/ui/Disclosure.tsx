'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Disclosure: tombol pemicu + panel, dengan aria-expanded yang selalu akurat.
 * Menutup dengan Escape dan klik di luar (§11.2).
 *
 * Dipakai UserMenu di TopBar; bukan untuk menu navigasi yang lebih besar dari
 * satu level.
 */
export function Disclosure({
  trigger,
  children,
  align = 'end',
  label,
}: {
  /** Isi tombol pemicu. */
  trigger: ReactNode;
  /** Panel yang muncul. */
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  /** Nama aksesibel bila pemicunya berupa ikon saja. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        // Fokus kembali ke pemicu agar pengguna tidak kehilangan posisi.
        rootRef.current?.querySelector('button')?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-label font-semibold text-text transition-func hover:bg-surface-dim"
      >
        {trigger}
      </button>

      {open ? (
        <div
          id={panelId}
          role="menu"
          className={`absolute z-50 mt-1 min-w-56 rounded-md border border-border-subtle bg-surface p-1 ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

/** Satu item menu. Dipakai di dalam Disclosure. */
export function DisclosureItem({
  onSelect,
  children,
  href,
}: {
  onSelect?: () => void;
  children: ReactNode;
  href?: string;
}) {
  const className =
    'flex w-full min-h-11 items-center gap-2 rounded-sm px-3 py-2 text-left text-body text-text transition-func hover:bg-surface-dim';

  if (href) {
    return (
      <a role="menuitem" href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onSelect} className={className}>
      {children}
    </button>
  );
}
