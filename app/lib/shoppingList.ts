// Consolidate recipe ingredients into a shopping list, summing quantities per
// (name, unit) instead of string-concatenating them.

export interface RawIngredient {
  name: string;
  amount: string;
  unit: string;
  category?: string;
}

export interface ConsolidatedItem {
  name: string;
  amount: string;
  unit: string;
  category: string;
}

// Parse a quantity string into a number. Handles integers, decimals and
// simple fractions ("1/2"). Returns null for non-numeric amounts ("to taste").
function parseAmount(amount: string): number | null {
  const trimmed = (amount ?? "").trim();
  if (!trimmed) return null;
  const frac = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (frac) {
    const d = parseFloat(frac[2]);
    return d !== 0 ? parseFloat(frac[1]) / d : null;
  }
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function consolidateIngredients(
  ingredients: RawIngredient[],
): ConsolidatedItem[] {
  interface Group {
    name: string;
    unit: string;
    category: string;
    numeric: number;
    hasNumeric: boolean;
    raw: string[];
  }
  const groups = new Map<string, Group>();

  for (const ing of ingredients) {
    const name = (ing.name ?? "").trim();
    if (!name) continue;
    const unit = (ing.unit ?? "").trim();
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        name,
        unit,
        category: ing.category || "Other",
        numeric: 0,
        hasNumeric: false,
        raw: [],
      };
      groups.set(key, g);
    }
    const parsed = parseAmount(ing.amount);
    if (parsed !== null) {
      g.numeric += parsed;
      g.hasNumeric = true;
    } else if ((ing.amount ?? "").trim()) {
      g.raw.push(ing.amount.trim());
    }
  }

  return Array.from(groups.values()).map((g) => {
    const parts: string[] = [];
    if (g.hasNumeric) parts.push(formatAmount(g.numeric));
    parts.push(...g.raw);
    return {
      name: g.name,
      unit: g.unit,
      category: g.category,
      amount: parts.join(" + "),
    };
  });
}
