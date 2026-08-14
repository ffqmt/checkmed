import { describe, it, expect } from "vitest";
import { namesLooselyMatch } from "./fuzzy-match";

describe("namesLooselyMatch", () => {
  it("matches identical names", () => {
    expect(namesLooselyMatch("Carlos Eduardo Silva", "Carlos Eduardo Silva")).toBe(true);
  });

  it("matches ignoring accents, case, and punctuation", () => {
    expect(namesLooselyMatch("José da Silva Júnior", "jose DA SILVA junior")).toBe(true);
  });

  it("matches when at least half the meaningful tokens overlap", () => {
    // "Dr. Carlos Silva" -> tokens after stripping stopwords: carlos, silva (2 tokens)
    // matches "Carlos Eduardo Silva Santos" which contains both -> 2/2 = 100%
    expect(namesLooselyMatch("Carlos Silva", "Carlos Eduardo Silva Santos")).toBe(true);
  });

  it("does not match unrelated names", () => {
    expect(namesLooselyMatch("Maria Oliveira", "João Pereira")).toBe(false);
  });

  it("does not match on stopword overlap alone (clinic/institution words)", () => {
    // "clinica" and "hospital" are stopwords — a bare overlap on those shouldn't count
    expect(namesLooselyMatch("Clinica Hospital", "Clinica Hospital Centro")).toBe(false);
  });

  it("returns false for empty input on either side", () => {
    expect(namesLooselyMatch("", "Carlos Silva")).toBe(false);
    expect(namesLooselyMatch("Carlos Silva", "")).toBe(false);
  });

  it("is order-independent for name tokens", () => {
    expect(namesLooselyMatch("Silva Carlos", "Carlos Silva")).toBe(true);
  });
});
