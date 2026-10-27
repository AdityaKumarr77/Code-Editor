export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="Aditya logo">
      <rect width="64" height="64" rx="14" fill="#f2b84b" />
      <path d="M14 48 L30 14 L46 48 M21 36 H39" fill="none" stroke="#121826" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="50" y="38" width="5" height="12" rx="1.5" fill="#121826" />
    </svg>
  );
}
