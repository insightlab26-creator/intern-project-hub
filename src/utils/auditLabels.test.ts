import { describe, expect, it } from "vitest";
import { auditChangedFieldLabel } from "./auditLabels";

describe("auditChangedFieldLabel", () => {
  it("uses friendly labels for known audit fields and preserves unknown fields", () => {
    expect(auditChangedFieldLabel("current_version")).toBe("Current Version");
    expect(auditChangedFieldLabel("problem_understanding")).toBe("Problem Understanding");
    expect(auditChangedFieldLabel("reviewer_id")).toBe("Reviewer");
    expect(auditChangedFieldLabel("unmapped_field")).toBe("unmapped_field");
  });
});
