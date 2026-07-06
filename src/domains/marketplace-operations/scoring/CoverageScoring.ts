import { CoverageDimension } from "../types/enums";
import type { CoverageGroupCount, CoverageGap } from "../types/coverage.types";

// A category/brand with fewer than this many products is flagged as an
// under-covered gap. Deliberately simple/documented threshold, not a
// statistical model — consistent with this project's preference for
// explainable rules over opaque scoring where a simple rule is honest.
export const LOW_COVERAGE_PRODUCT_THRESHOLD = 3;

export function findCoverageGaps(
  dimension: CoverageDimension.Category | CoverageDimension.Brand,
  groups: CoverageGroupCount[]
): CoverageGap[] {
  return groups
    .filter((g) => g.productCount < LOW_COVERAGE_PRODUCT_THRESHOLD)
    .sort((a, b) => a.productCount - b.productCount)
    .map((g) => ({ dimension, id: g.id, name: g.name, productCount: g.productCount }));
}
