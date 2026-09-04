import { describe, expect, it } from "vitest";
import { assetMatchesFilters } from "../src/web/projects";

describe("assetMatchesFilters", () => {
  const background = { name: "Bedroom Background", category: "background" };

  it("matches asset names case-insensitively by substring", () => {
    expect(assetMatchesFilters(background, "bed", "all")).toBe(true);
    expect(assetMatchesFilters(background, "ROOM", "all")).toBe(true);
    expect(assetMatchesFilters(background, "forest", "all")).toBe(false);
  });

  it("combines name and category filters", () => {
    expect(assetMatchesFilters(background, "bed", "background")).toBe(true);
    expect(assetMatchesFilters(background, "bed", "character")).toBe(false);
    expect(assetMatchesFilters(background, "", "background")).toBe(true);
  });
});
