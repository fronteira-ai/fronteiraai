import type { CoverageDimension } from "./enums";

export interface CoverageGroupCount {
  id: string;
  name: string;
  productCount: number;
}

export interface CoverageGap {
  dimension: CoverageDimension;
  id: string;
  name: string;
  productCount: number;
}

export interface CoverageSnapshot {
  totalStores: number;
  discoveredStores: number;
  syncedStores: number;
  claimedStores: number;
  byCategory: CoverageGroupCount[];
  byBrand: CoverageGroupCount[];
  byCity: CoverageGroupCount[];
  canonicalBootstrapPct: number;
  gaps: CoverageGap[];
  generatedAt: string;
}
