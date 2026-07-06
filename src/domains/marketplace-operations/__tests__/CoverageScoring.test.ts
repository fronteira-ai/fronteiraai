import { findCoverageGaps, LOW_COVERAGE_PRODUCT_THRESHOLD } from "../scoring/CoverageScoring";
import { CoverageDimension } from "../types/enums";

describe("findCoverageGaps", () => {
  it("flags groups with fewer products than the threshold", () => {
    const gaps = findCoverageGaps(CoverageDimension.Category, [
      { id: "c1", name: "Eletrônicos", productCount: 100 },
      { id: "c2", name: "Nicho Raro", productCount: 1 },
      { id: "c3", name: "Vazia", productCount: 0 },
    ]);

    expect(gaps.map((g) => g.id)).toEqual(["c3", "c2"]);
  });

  it("does not flag a group exactly at the threshold", () => {
    const gaps = findCoverageGaps(CoverageDimension.Brand, [
      { id: "b1", name: "Marca X", productCount: LOW_COVERAGE_PRODUCT_THRESHOLD },
    ]);
    expect(gaps).toHaveLength(0);
  });

  it("returns an empty list when every group is well covered", () => {
    const gaps = findCoverageGaps(CoverageDimension.Category, [{ id: "c1", name: "Boa", productCount: 50 }]);
    expect(gaps).toEqual([]);
  });

  it("sorts gaps ascending by productCount (worst first)", () => {
    const gaps = findCoverageGaps(CoverageDimension.Category, [
      { id: "c1", name: "A", productCount: 2 },
      { id: "c2", name: "B", productCount: 0 },
      { id: "c3", name: "C", productCount: 1 },
    ]);
    expect(gaps.map((g) => g.id)).toEqual(["c2", "c3", "c1"]);
  });

  it("carries the dimension through to each gap", () => {
    const gaps = findCoverageGaps(CoverageDimension.Brand, [{ id: "b1", name: "Marca Rara", productCount: 0 }]);
    expect(gaps[0].dimension).toBe(CoverageDimension.Brand);
  });
});
