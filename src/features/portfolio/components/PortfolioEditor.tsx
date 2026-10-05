'use client';

import { useActionState, useState } from 'react';
import { createPortfolioItem, deletePortfolioItem, updatePortfolioItem } from '@/features/portfolio/actions';
import {
  PORTFOLIO_KINDS,
  PORTFOLIO_KIND_LABEL,
  PORTFOLIO_LIMIT,
} from '@/features/portfolio/schemas';
import type { PortfolioRow } from '@/features/portfolio/queries';
import { MAX_IMAGE_BYTES, UPLOAD_ERROR_MESSAGE } from '@/lib/storage/magic-bytes';
import { AudienceSelect } from '@/components/visibility/AudienceSelect';
import type { VisibilityEntry, VisibilityKey } from '@/lib/visibility/registry';
import { FormField } from '@/components/ui/FormField';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import type { FormState } from '@/lib/result';

const ACCEPT = 'image/jpeg,image/png,image/webp';

function fieldErrors(state: FormState): Record<string, string[]> | undefined {
  return state && !state.ok ? state.error.fieldErrors : undefined;
}

function kindLabel(kind: string): string {
  return PORTFOLIO_KIND_LABEL[kind as (typeof PORTFOLIO_KINDS)[number]] ?? kind;
}

/**
 * Field yang sama dipakai form tambah dan form ubah supaya batas dan aturan
 * validasi tidak berbeda di antara keduanya.
 */
function ItemFields({
  prefix,
  defaults,
  errors,
}: {
  prefix: string;
  defaults?: PortfolioRow;
  errors?: Record<string, string[]>;
}) {
  const first = (name: string) => errors?.[name]?.[0];

  return (
    <>
      <FormField id={`${prefix}-kind`} label="Jenis" error={first('kind')} required>
        {(describedBy) => (
          <Select
            id={`${prefix}-kind`}
            name="kind"
            defaultValue={defaults?.kind ?? PORTFOLIO_KINDS[0]}
            describedBy={describedBy}
            invalid={Boolean(first('kind'))}
          >
            {PORTFOLIO_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PORTFOLIO_KIND_LABEL[kind]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField id={`${prefix}-title`} label="Judul" error={first('title')} required>
        {(describedBy) => (
          <Input
            id={`${prefix}-title`}
            name="title"
            required
            maxLength={100}
            defaultValue={defaults?.title}
            invalid={Boolean(first('title'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id={`${prefix}-occurred-on`} label="Tanggal" error={first('occurred_on')} required>
        {(describedBy) => (
          <Input
            id={`${prefix}-occurred-on`}
            name="occurred_on"
            type="date"
            required
            defaultValue={defaults?.occurred_on}
            invalid={Boolean(first('occurred_on'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField id={`${prefix}-description`} label="Deskripsi" error={first('description')}>
        {(describedBy) => (
          <Textarea
            id={`${prefix}-description`}
            name="description"
            rows={4}
            maxLength={1000}
            defaultValue={defaults?.description ?? ''}
            invalid={Boolean(first('description'))}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id={`${prefix}-url`}
        label="Tautan"
        hint="Opsional. Harus diawali https://."
        error={first('url')}
      >
        {(describedBy) => (
          <Input
            id={`${prefix}-url`}
            name="url"
            type="url"
            inputMode="url"
            maxLength={2048}
            defaultValue={defaults?.url ?? ''}
            invalid={Boolean(first('url'))}
            describedBy={describedBy}
          />
        )}
      </FormField>
    </>
  );
}

function PortfolioRowEditor({
  item,
  map,
}: {
  item: PortfolioRow;
  map: Record<VisibilityKey, VisibilityEntry>;
}) {
  const [updateState, updateAction] = useActionState(updatePortfolioItem, null);
  const [removeState, removeAction] = useActionState(deletePortfolioItem, null);
  const [confirming, setConfirming] = useState(false);

  const errors = fieldErrors(updateState);
  const fileError = updateState && !updateState.ok ? updateState.error.fieldErrors?.file?.[0] : undefined;

  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle py-4 first:border-t-0">
      <FormStatus state={removeState} />

      <form action={updateAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={item.id} />

        <ItemFields prefix={`item-${item.id}`} defaults={item} errors={errors} />

        <FormField
          id={`item-${item.id}-file`}
          label="Ganti gambar"
          hint={`${UPLOAD_ERROR_MESSAGE} Batas ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB. Kosongkan untuk mempertahankan gambar sekarang.`}
          error={fileError}
        >
          {(describedBy) => (
            <Input
              id={`item-${item.id}-file`}
              name="file"
              type="file"
              accept={ACCEPT}
              invalid={Boolean(fileError)}
              describedBy={describedBy}
            />
          )}
        </FormField>

        <FormField
          id={`item-${item.id}-visibility`}
          label="Siapa yang boleh melihat item ini"
          error={errors?.visibility?.[0]}
        >
          {() => (
            <AudienceSelect
              id={`item-${item.id}-visibility`}
              name="visibility"
              visibilityKey="item.portfolio"
              value={item.visibility ?? ''}
              map={map}
              defaultLabel="Ikut aturan portofolio"
              invalid={Boolean(errors?.visibility?.[0])}
            />
          )}
        </FormField>

        <FormStatus state={updateState} />

        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Menyimpan…">Simpan item</SubmitButton>
          <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
            Hapus
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          const fd = new FormData();
          fd.set('id', item.id);
          await removeAction(fd);
        }}
        title={`Hapus ${item.title}?`}
        consequence="Item ini dan gambarnya akan dihapus permanen dan tidak dapat dibatalkan."
        confirmLabel="Hapus item"
        pendingLabel="Menghapus…"
      />
    </div>
  );
}

function AddPortfolioForm({ map }: { map: Record<VisibilityKey, VisibilityEntry> }) {
  const [state, action] = useActionState(createPortfolioItem, null);
  const errors = fieldErrors(state);
  const fileError = state && !state.ok ? state.error.fieldErrors?.file?.[0] : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormStatus state={state} />

      <ItemFields prefix="new-item" errors={errors} />

      <FormField
        id="new-item-file"
        label="Gambar"
        hint={`${UPLOAD_ERROR_MESSAGE} Batas ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`}
        error={fileError}
      >
        {(describedBy) => (
          <Input
            id="new-item-file"
            name="file"
            type="file"
            accept={ACCEPT}
            invalid={Boolean(fileError)}
            describedBy={describedBy}
          />
        )}
      </FormField>

      <FormField
        id="new-item-visibility"
        label="Siapa yang boleh melihat item ini"
        error={errors?.visibility?.[0]}
      >
        {() => (
          <AudienceSelect
            id="new-item-visibility"
            name="visibility"
            visibilityKey="item.portfolio"
            value=""
            map={map}
            defaultLabel="Ikut aturan portofolio"
            invalid={Boolean(errors?.visibility?.[0])}
          />
        )}
      </FormField>

      <SubmitButton pendingLabel="Menyimpan…">Tambah item</SubmitButton>
    </form>
  );
}

/**
 * Kelola portofolio milik anggota sendiri.
 *
 * Batas jumlah item (50) ditegakkan trigger `social_limit`/`portfolio_limit` di
 * database; batas ini hanya ditampilkan supaya kehabisan batas terasa seperti
 * aturan, bukan seperti kegagalan yang misterius.
 */
export function PortfolioEditor({
  items,
  map,
}: {
  items: PortfolioRow[];
  map: Record<VisibilityKey, VisibilityEntry>;
}) {
  const atLimit = items.length >= PORTFOLIO_LIMIT;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <p className="text-small text-text-muted">
            Belum ada item. Tambahkan proyek, prestasi, atau pengalaman yang ingin kamu tunjukkan.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-col gap-1">
              <p className="text-small font-semibold text-text">
                {item.title}
                <span className="ms-2 font-normal text-text-muted">{kindLabel(item.kind)}</span>
              </p>
              <PortfolioRowEditor item={item} map={map} />
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border-subtle pt-6">
        <h3 className="text-h3 font-semibold text-text">Tambah item</h3>

        {atLimit ? (
          <p className="text-small text-text-muted">
            {`Sudah mencapai batas ${PORTFOLIO_LIMIT} item. Hapus salah satu sebelum menambah yang baru.`}
          </p>
        ) : (
          <AddPortfolioForm map={map} />
        )}
      </div>
    </div>
  );
}