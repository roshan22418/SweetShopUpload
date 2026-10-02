"use client";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function QuantityStepper({ value, onChange, min = 1, max, disabled }: QuantityStepperProps) {
  function clamp(next: number) {
    let v = next;
    if (v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  }

  return (
    <div className="inline-flex items-center rounded-md border border-gray-300 bg-white">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="flex h-9 w-9 items-center justify-center text-lg font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-semibold text-gray-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(clamp(value + 1))}
        className="flex h-9 w-9 items-center justify-center text-lg font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
