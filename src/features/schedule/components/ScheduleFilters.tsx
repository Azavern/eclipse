'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WEEKDAYS } from '@/features/schedule/schemas';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Input';

/**
 * Penyaring jadwal: semester dan hari.
 *
 * Pilihannya hidup di URL (`?semester=…&day=…`), bukan di state komponen,
 * supaya bisa di-bookmark, dibagikan, dan tidak hilang saat halaman dimuat
 * ulang (§8). Perpindahan memakai transisi supaya daftar yang sedang tampil
 * tetap terlihat sampai data baru siap, bukan berkedip kosong.
 */
export function ScheduleFilters({
  semesters,
  semester,
  day,
}: {
  semesters: string[];
  semester: string;
  /** `null` = tampilkan seluruh jadwal semester ini. */
  day: number | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const navigate = (key: 'semester' | 'day', value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/schedule?${next.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row" aria-busy={pending}>
      <div className="w-full sm:w-72">
        <FormField id="filter-semester" label="Semester">
          {(describedBy) => (
            <Select
              id="filter-semester"
              name="semester"
              value={semester}
              describedBy={describedBy}
              onChange={(event) => navigate('semester', event.target.value)}
            >
              {semesters.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <div className="w-full sm:w-48">
        <FormField id="filter-day" label="Hari">
          {(describedBy) => (
            <Select
              id="filter-day"
              name="day"
              value={day === null ? '' : String(day)}
              describedBy={describedBy}
              onChange={(event) => navigate('day', event.target.value)}
            >
              <option value="">Semua hari</option>
              {WEEKDAYS.map((weekday) => (
                <option key={weekday.value} value={String(weekday.value)}>
                  {weekday.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
    </div>
  );
}
