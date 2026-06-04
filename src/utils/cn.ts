// ─────────────────────────────────────────────────────────────────────────────
// cn — className merge utility (like clsx + twMerge, zero dependencies)
// ─────────────────────────────────────────────────────────────────────────────

type ClassValue = string | undefined | null | false | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat(Infinity as 20)
    .filter(Boolean)
    .join(' ')
    .trim();
}
