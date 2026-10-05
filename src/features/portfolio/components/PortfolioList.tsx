import { createClient } from '@/lib/supabase/server';
import { signMany } from '@/lib/storage/sign';
import { SignedImage } from '@/components/storage/SignedImage';
import { List, ListItem } from '@/components/ui/Section';
import { formatDateOnly } from '@/lib/time';
import { PORTFOLIO_KIND_LABEL, type PortfolioKind } from '../schemas';
import type { PortfolioRow } from '../queries';

/** Label jenis item; jatuh ke nilai mentah bila kinds-nya tak dikenal. */
function kindLabel(kind: string): string {
  return PORTFOLIO_KIND_LABEL[kind as PortfolioKind] ?? kind;
}

/**
 * Daftar portofolio yang terlihat oleh viewer ini.
 *
 * Media ditandatangani sekali untuk seluruh item (batch), bukan per item, supaya
 * halaman dengan banyak item tidak membuka N+1 permintaan Storage. Path yang tidak
 * terlihat tidak mungkin ada di sini karena barisnya sudah disaring RLS.
 */
export async function PortfolioList({ items }: { items: PortfolioRow[] }) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-small text-text-muted">
        Belum ada item portofolio yang bisa dilihat.
      </p>
    );
  }

  const supabase = await createClient();
  const signed = await signMany(
    supabase,
    'member-media',
    items.map((item) => item.media_path),
  );

  return (
    <List>
      {items.map((item) => {
        const mediaUrl = item.media_path ? signed.get(item.media_path) : undefined;
        return (
          <ListItem key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {mediaUrl ? (
              <SignedImage
                src={mediaUrl}
                alt={`Gambar ${item.title}`}
                width={240}
                height={160}
                className="w-full rounded-md border border-border-subtle object-cover sm:w-40"
              />
            ) : null}

            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-body font-semibold text-text">{item.title}</p>
              <p className="text-caption text-text-muted">
                {kindLabel(item.kind)} · {formatDateOnly(item.occurred_on)}
              </p>
              {item.description ? (
                <p className="text-small text-text">{item.description}</p>
              ) : null}
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-small text-primary underline"
                >
                  Buka tautan
                </a>
              ) : null}
            </div>
          </ListItem>
        );
      })}
    </List>
  );
}