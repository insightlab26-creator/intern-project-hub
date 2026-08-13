import { describe, expect, it } from "vitest";
import { formatProjectKeywords, parseProjectKeywords } from "./projectKeywords";

describe("project keyword helpers", () => {
  it("# 단위로 키워드를 분리하고 중복을 제거한다", () => {
    expect(parseProjectKeywords("#AI #인턴 관리 #AI")).toEqual(["AI", "인턴 관리"]);
  });

  it("저장된 키워드를 # 입력 형식으로 표시한다", () => {
    expect(formatProjectKeywords(["AI", "인턴 관리"])).toBe("#AI #인턴 관리");
  });
});
