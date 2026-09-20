import type { ChangeEvent, ReactNode } from 'react';
import { ChevronDown, Shield } from 'lucide-react';

type BtnVariant = 'primary' | 'secondary' | 'ghost';

const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hi shadow-brand',
  secondary: 'border border-line bg-transparent text-ink2 hover:bg-hover',
  ghost: 'border border-transparent bg-transparent text-ink3 hover:bg-hover',
};

export function Btn({
  variant = 'primary',
  children,
  onClick,
  big = false,
}: {
  variant?: BtnVariant;
  children: ReactNode;
  onClick?: () => void;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-[10px] font-semibold transition-colors ${
        big ? 'px-[22px] py-3 text-[13.5px]' : 'px-[18px] py-2.5 text-[13px]'
      } ${BTN[variant]}`}
    >
      {children}
    </button>
  );
}

/** Dòng trấn an cuối màn — khiên nét, không dùng emoji vì nhạt trên nền sáng. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex items-center gap-2.5 text-[11.5px] leading-relaxed text-ink4">
      <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** Vòng xoay báo đang chạy. Tự vẽ để không phụ thuộc tên icon. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-soft border-t-brand ${className}`}
      aria-hidden="true"
    />
  );
}

/** Ô chọn nhỏ nằm ngay trong ô nhập ở màn hình đầu. */
export function Sel({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  const handle = (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value);
  return (
    <div className="relative shrink-0">
      <select
        aria-label={label}
        value={value}
        onChange={handle}
        className="cursor-pointer appearance-none rounded-lg border border-line bg-soft py-[7px] pl-[11px] pr-7 text-[11.5px] text-ink2 outline-none hover:bg-hover focus:border-brand-line"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink4"
        aria-hidden="true"
      />
    </div>
  );
}
