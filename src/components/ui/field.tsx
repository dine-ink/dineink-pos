import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives for the POS. Every control is touch-height by default and
 * inherits the >=16px font-size rule from index.css, which is what stops iOS
 * zooming the viewport on focus (it never zooms back out, leaving a cashier
 * stranded on a magnified till).
 *
 * Labels are real <label for> elements with generated ids rather than
 * placeholder-only inputs: a placeholder disappears the moment someone types,
 * so a half-filled form on a shared tablet becomes unreadable to whoever picks
 * it up next.
 */

const controlBase =
  "w-full rounded-control border border-input bg-card px-3 text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

type FieldProps = {
  label: string;
  htmlFor?: string;
  /** Shown under the control — the place for units, formats, or why a value matters. */
  hint?: string;
  /** Replaces `hint` and turns the control red. */
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {(error || hint) && (
        <p className={cn("text-xs leading-snug", error ? "text-destructive" : "text-subtle-foreground")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

/** Responsive form grid — one column on a phone, two from `sm` up. */
export function FieldGrid({
  columns = 2,
  className,
  children,
}: {
  columns?: 1 | 2 | 3;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TextInput({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(controlBase, "h-11", invalid && "border-destructive focus:border-destructive", className)}
      {...props}
    />
  );
}

export function NumberInput({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      type="number"
      // inputMode="decimal" gets the numeric keypad on both platforms; without
      // it Android shows the full qwerty keyboard for type=number.
      inputMode="decimal"
      className={cn(
        controlBase,
        "h-11 tnum",
        invalid && "border-destructive focus:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      // A native <select> on purpose: iOS and Android render it as a
      // system-native wheel/dropdown, which is faster and more reliable on a
      // touch device than any custom listbox, and works offline.
      className={cn(
        controlBase,
        "h-11 appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-9",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236e6663%22 stroke-width=%222.5%22 stroke-linecap=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>')]",
        invalid && "border-destructive focus:border-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextArea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        controlBase,
        "min-h-[5rem] resize-y py-2.5",
        invalid && "border-destructive focus:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Big tappable yes/no. Used instead of a checkbox wherever the answer drives
 * something operational (equipment in service or down, item available or sold
 * out) — a 16px checkbox is the single worst target on a touch screen.
 */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-control border px-3 py-2 text-left transition-colors",
        checked ? "border-primary/35 bg-red-50" : "border-border bg-card hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
