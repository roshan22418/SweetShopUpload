export default function CrownMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 17.5h17L19 8.5l-4.2 3.6-2.8-5.4-2.8 5.4L5 8.5z" />
      <path d="M3.5 19.5h17" />
    </svg>
  );
}
