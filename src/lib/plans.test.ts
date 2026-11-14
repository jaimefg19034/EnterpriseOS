import { describe, expect, it } from "vitest";
import { canAccessView, minimumPlanForView } from "./plans";

describe("subscription entitlements", () => {
  it("keeps the Essential workspace to the core financial view", () => {
    expect(canAccessView("essential", "overview")).toBe(true);
    expect(canAccessView("essential", "model")).toBe(true);
    expect(canAccessView("essential", "planning")).toBe(false);
    expect(canAccessView("essential", "statements")).toBe(false);
    expect(canAccessView("essential", "reports")).toBe(false);
    expect(canAccessView("essential", "operations")).toBe(false);
  });

  it("unlocks planning and reporting with Professional", () => {
    expect(canAccessView("professional", "planning")).toBe(true);
    expect(canAccessView("professional", "statements")).toBe(true);
    expect(canAccessView("professional", "reports")).toBe(true);
    expect(canAccessView("professional", "operations")).toBe(false);
  });

  it("unlocks every current workspace area with Business", () => {
    expect(canAccessView("business", "operations")).toBe(true);
    expect(canAccessView("business", "reports")).toBe(true);
  });

  it("identifies the minimum tier required by each restricted area", () => {
    expect(minimumPlanForView("planning")).toBe("professional");
    expect(minimumPlanForView("operations")).toBe("business");
  });
});
