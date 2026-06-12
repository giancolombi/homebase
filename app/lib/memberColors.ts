export const MEMBER_COLORS: Record<number, string> = {
  1: "bg-member-1",
  2: "bg-member-2",
  3: "bg-member-3",
  4: "bg-member-4",
  5: "bg-member-5",
  6: "bg-member-6",
};

export const MEMBER_TEXT_COLORS: Record<number, string> = {
  1: "text-member-1",
  2: "text-member-2",
  3: "text-member-3",
  4: "text-member-4",
  5: "text-member-5",
  6: "text-member-6",
};

export const MEMBER_BORDER_COLORS: Record<number, string> = {
  1: "border-member-1",
  2: "border-member-2",
  3: "border-member-3",
  4: "border-member-4",
  5: "border-member-5",
  6: "border-member-6",
};

export const MEMBER_BG_LIGHT: Record<number, string> = {
  1: "bg-member-1/10",
  2: "bg-member-2/10",
  3: "bg-member-3/10",
  4: "bg-member-4/10",
  5: "bg-member-5/10",
  6: "bg-member-6/10",
};

export function getMemberInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Local optimistic ids for store entities. The sync layer swaps these for
// the server-assigned UUID once a create push resolves, but they must still
// be collision-free locally — use real UUIDs, not Math.random fragments.
export function generateId(): string {
  return crypto.randomUUID();
}
