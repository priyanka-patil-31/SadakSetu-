import { describe, expect, it } from "vitest";
import { validComplaintTransitions } from "@/lib/complaints-data";

describe("complaint status transitions", () => {
  it("does not offer an invalid direct submitted-to-in-progress transition", () => {
    expect(validComplaintTransitions.SUBMITTED).not.toContain("IN_PROGRESS");
    expect(validComplaintTransitions.SUBMITTED).toContain("UNDER_REVIEW");
  });

  it("allows progress only after assignment", () => {
    expect(validComplaintTransitions.ASSIGNED).toContain("IN_PROGRESS");
    expect(validComplaintTransitions.IN_PROGRESS).toEqual(["RESOLVED"]);
  });
});
