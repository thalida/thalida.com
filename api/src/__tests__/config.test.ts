import { describe, it, expect } from "vitest";
import { generateRandomUsername, COLORS, ANIMALS, ADMIN_USERNAME } from "../config";

describe("config", () => {
  describe("generateRandomUsername", () => {
    it("returns a string in color-animal format", () => {
      const name = generateRandomUsername();
      expect(name).toMatch(/^[a-z]+-[a-z]+$/);
    });

    it("uses valid colors and animals", () => {
      for (let i = 0; i < 20; i++) {
        const name = generateRandomUsername();
        const [color, animal] = name.split("-");
        expect(COLORS).toContain(color);
        expect(ANIMALS).toContain(animal);
      }
    });

    it("generates lowercase names only", () => {
      for (let i = 0; i < 20; i++) {
        const name = generateRandomUsername();
        expect(name).toBe(name.toLowerCase());
      }
    });

    it("generates different names across calls (not deterministic)", () => {
      const names = new Set<string>();
      for (let i = 0; i < 50; i++) {
        names.add(generateRandomUsername());
      }
      // With 30 colors * 37 animals = 1,110 combinations, 50 calls should produce at least 2 unique names
      expect(names.size).toBeGreaterThan(1);
    });

    it("never generates a name containing the admin username", () => {
      for (let i = 0; i < 100; i++) {
        const name = generateRandomUsername();
        expect(name.includes(ADMIN_USERNAME)).toBe(false);
      }
    });
  });

  describe("constants", () => {
    it("COLORS array is non-empty", () => {
      expect(COLORS.length).toBeGreaterThan(0);
    });

    it("ANIMALS array is non-empty", () => {
      expect(ANIMALS.length).toBeGreaterThan(0);
    });
  });
});
