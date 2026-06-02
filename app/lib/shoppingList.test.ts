import { describe, it, expect } from "vitest";
import { consolidateIngredients } from "./shoppingList";

describe("consolidateIngredients", () => {
  it("sums quantities for the same name + unit", () => {
    const out = consolidateIngredients([
      { name: "Flour", amount: "200", unit: "g" },
      { name: "flour", amount: "100", unit: "g" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "Flour", amount: "300", unit: "g" });
  });

  it("keeps different units as separate lines", () => {
    const out = consolidateIngredients([
      { name: "Milk", amount: "2", unit: "cups" },
      { name: "Milk", amount: "200", unit: "ml" },
    ]);
    expect(out).toHaveLength(2);
  });

  it("does NOT string-concatenate numeric amounts (regression)", () => {
    const out = consolidateIngredients([
      { name: "Egg", amount: "2", unit: "" },
      { name: "Egg", amount: "1", unit: "" },
      { name: "Egg", amount: "2", unit: "" },
    ]);
    expect(out[0].amount).toBe("5");
    expect(out[0].amount).not.toContain(",");
  });

  it("handles fractions", () => {
    const out = consolidateIngredients([
      { name: "Butter", amount: "1/2", unit: "cup" },
      { name: "Butter", amount: "1/2", unit: "cup" },
    ]);
    expect(out[0].amount).toBe("1");
  });

  it("preserves non-numeric amounts like 'to taste'", () => {
    const out = consolidateIngredients([
      { name: "Salt", amount: "to taste", unit: "" },
      { name: "Salt", amount: "1", unit: "" },
    ]);
    // numeric sum first, then the free-text amount
    expect(out[0].amount).toContain("1");
    expect(out[0].amount).toContain("to taste");
  });

  it("defaults category to Other and preserves provided categories", () => {
    const out = consolidateIngredients([
      { name: "Apple", amount: "3", unit: "", category: "Produce" },
      { name: "Sugar", amount: "1", unit: "cup" },
    ]);
    const apple = out.find((i) => i.name === "Apple");
    const sugar = out.find((i) => i.name === "Sugar");
    expect(apple?.category).toBe("Produce");
    expect(sugar?.category).toBe("Other");
  });
});
