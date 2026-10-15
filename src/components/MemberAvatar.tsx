import type { Gender } from "@/types/database";

// Same gender palette used in Analytics — kept consistent app-wide.
const GENDER_COLORS: Record<Gender | "unset", string> = {
  female: "#2a78d6",
  male: "#eb6834",
  other: "#1baf7a",
  unset: "#b9b8b2",
};

/** A member's photo, or a minimal placeholder silhouette (tinted by gender once known) when they haven't uploaded one. */
export function MemberAvatar({
  photoUrl,
  gender,
  size = 40,
  className = "",
}: {
  photoUrl: string | null | undefined;
  gender?: Gender | null;
  size?: number;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const color = GENDER_COLORS[gender ?? "unset"];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, backgroundColor: `${color}26` }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6" />
      </svg>
    </div>
  );
}
