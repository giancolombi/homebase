import type { FoodLabRecipe } from "@/types/foodlab";
import { parseFoodLabRecipe } from "./foodlabParser";

// Public FoodLab recipe repository. No auth needed for public content APIs.
const GH_OWNER = "giancolombi";
const GH_REPO = "foodlab";
const RECIPE_DIRS: { path: string; category: "main" | "breakfast" }[] = [
  { path: "recipes", category: "main" },
  { path: "breakfast", category: "breakfast" },
];

interface GitHubContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}

async function listDir(path: string): Promise<GitHubContentItem[]> {
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (res.status === 404) return []; // directory doesn't exist — skip silently
  if (!res.ok) {
    throw new Error(
      `GitHub listing failed for ${path}: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as GitHubContentItem[];
  return data;
}

async function fetchRaw(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.text();
}

/**
 * Fetch and parse all FoodLab recipes from the public GitHub repository.
 * Throws on network / API errors so callers can surface a toast.
 */
export async function fetchFoodlabRecipes(): Promise<FoodLabRecipe[]> {
  const recipes: FoodLabRecipe[] = [];

  for (const dir of RECIPE_DIRS) {
    const items = await listDir(dir.path);
    const mdFiles = items.filter(
      (i) => i.type === "file" && i.name.endsWith(".md") && i.download_url,
    );

    // Fetch in parallel but bounded to avoid hammering the API.
    const chunks = chunk(mdFiles, 8);
    for (const batch of chunks) {
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const content = await fetchRaw(file.download_url!);
            return parseFoodLabRecipe(file.name, content, dir.category);
          } catch (err) {
            console.warn(`Skipped ${file.path}:`, err);
            return null;
          }
        }),
      );
      for (const r of batchResults) if (r) recipes.push(r);
    }
  }

  return recipes;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
