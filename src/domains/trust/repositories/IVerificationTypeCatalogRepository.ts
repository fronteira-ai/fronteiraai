import type { VerificationTypeCatalogRecord } from "../types/trust.types";
import type { VerificationCategory } from "../types/enums";

export interface IVerificationTypeCatalogRepository {
  findAll(activeOnly?: boolean): Promise<VerificationTypeCatalogRecord[]>;
  findById(id: string): Promise<VerificationTypeCatalogRecord | null>;
  findByCategory(category: VerificationCategory): Promise<VerificationTypeCatalogRecord[]>;
}
