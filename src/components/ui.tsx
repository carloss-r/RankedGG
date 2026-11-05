import type { CSSProperties, ReactNode } from "react";

export function Glass({
  children,
  className = "",
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const classes = `glass rounded-[28px] text-left text-inherit ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} style={style}>
        {children}
      </button>
    );
  }
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block px-1 text-[12px] font-medium tracking-[0.14em] text-white/50 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  autoComplete,
  autoFocus,
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "numeric" | "text";
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  return (
    <input
      value={value}
      type={type}
      inputMode={inputMode}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && onEnter) onEnter();
      }}
      className="h-14 w-full rounded-2xl border border-white/12 bg-white/8 px-4 text-[17px] text-white outline-none placeholder:text-white/30"
    />
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-2xl bg-rose-500/15 px-4 py-3 text-[14px] leading-5 text-rose-200"
    >
      {children}
    </p>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-[14px] leading-5 text-emerald-200"
    >
      {children}
    </p>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-14 w-full rounded-full bg-white text-[16px] font-semibold text-black disabled:opacity-40"
    >
      {children}
    </button>
  );
}
