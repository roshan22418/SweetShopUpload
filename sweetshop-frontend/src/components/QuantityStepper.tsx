"use client";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Read by screen readers, e.g. "Quantity of Samosa". */
  label?: string;
}

export default function QuantityStepper({ value, onChange, min = 1, max, disabled, label = "Quantity" }: QuantityStepperProps) {
  function clamp(next: number) {
    let v = next;
    if (v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  }

  const buttonClass =
    "flex h-9 w-9 items-center justify-center text-lg font-medium text-ink transition hover:bg-gold-light/40 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div role="group" aria-label={label} className="inline-flex flex-none items-center overflow-hidden rounded-full border border-gold-light bg-white">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className={buttonClass}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold text-ink" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(clamp(value + 1))}
        className={buttonClass}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
