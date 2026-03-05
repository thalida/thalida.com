import { describe, it, expect, beforeAll } from "vitest";
import {
  generateRandomUsername,
  validateUsername,
  setAdminUsername,
  COLORS,
  ANIMALS,
} from "@components/Chat/chat-utils";

describe("generateRandomUsername", () => {
  it("returns a string in color-animal format", () => {
    const name = generateRandomUsername();
    const parts = name.split("-");
    expect(parts).toHaveLength(2);
    expect(COLORS).toContain(parts[0]);
    expect(ANIMALS).toContain(parts[1]);
  });

  it("only produces valid characters (lowercase, hyphens)", () => {
    for (let i = 0; i < 50; i++) {
      const name = generateRandomUsername();
      expect(name).toMatch(/^[a-z]+-[a-z]+$/);
    }
  });

  it("produces different names across multiple calls", () => {
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      names.add(generateRandomUsername());
    }
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("validateUsername", () => {
  beforeAll(() => {
    setAdminUsername("testadmin");
  });

  describe("accepts valid usernames", () => {
    it.each(["red-fox", "user.1", "ab", "test_user", "a-b.c_d", "hello123", "xx"])("accepts '%s'", (name) => {
      expect(validateUsername(name)).toEqual({ valid: true });
    });
  });

  describe("rejects admin username", () => {
    it("rejects exact admin username", () => {
      const result = validateUsername("testadmin");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reserved");
    });

    it("rejects admin username as substring", () => {
      const result = validateUsername("nottestadmin");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reserved");
    });

    it("rejects admin username embedded in name", () => {
      const result = validateUsername("x-testadmin-x");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reserved");
    });
  });

  describe("rejects names that are too short", () => {
    it("rejects single character 'x'", () => {
      const result = validateUsername("x");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("2 characters");
    });

    it("rejects empty string", () => {
      const result = validateUsername("");
      expect(result.valid).toBe(false);
    });
  });

  describe("rejects invalid characters", () => {
    it("rejects uppercase letters", () => {
      const result = validateUsername("HelloWorld");
      expect(result.valid).toBe(false);
    });

    it("rejects spaces", () => {
      const result = validateUsername("has spaces");
      expect(result.valid).toBe(false);
    });

    it("rejects emoji", () => {
      const result = validateUsername("cool😎user");
      expect(result.valid).toBe(false);
    });

    it("rejects special characters", () => {
      const result = validateUsername("user@name!");
      expect(result.valid).toBe(false);
    });
  });

  describe("security: XSS payloads", () => {
    it("rejects script tag as username", () => {
      const result = validateUsername('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
    });

    it("rejects img onerror payload", () => {
      const result = validateUsername('<img onerror=alert(1) src="x">');
      expect(result.valid).toBe(false);
    });

    it("rejects javascript: protocol", () => {
      const result = validateUsername("javascript:alert(1)");
      expect(result.valid).toBe(false);
    });
  });
});
