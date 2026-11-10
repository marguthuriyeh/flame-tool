import type { CSSProperties } from "react";

export function FlameIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M32 3c1.2 8.5-.8 13-3.6 17.2 3.2-.4 6.4 1.6 7.6 5.2 4.8 2.2 9.6 7.4 10.4 14.2C47.6 50.2 41.2 58 32.4 58 22.2 58 15 50.4 16.2 41.6c.4-2.8 1.8-5 3.4-6.8-2.6 1.2-6.2.2-8.2-2.6-2.2-3-2.6-7.2-1-11.2C12.6 15.2 18.4 10.4 24 8.2 25.2 12.8 27.2 15.6 30 17.2 28.6 12.4 29.4 7.6 32 3z"
      />
      <path
        fill="currentColor"
        opacity="0.42"
        d="M32.2 27.5c2.4 4.8 6.2 8.2 6.6 13.2.4 5.2-2.8 9.3-6.8 9.3-3.6 0-6.4-2.8-6.6-6.6-.2-2.6 1-4.6 2.4-6.4-1.6.6-3.4.2-4.4-1.4-1-1.8-.8-4 .4-6 1.6-2.6 4.2-4.2 6.2-5.2.8 1.4 1.6 2.2 2.2 3.1z"
      />
    </svg>
  );
}
