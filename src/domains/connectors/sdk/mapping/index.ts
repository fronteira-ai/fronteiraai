// Re-exported, not moved — IFieldMapper/CsvFieldMapper/JsonFieldMapper are
// pre-existing (Release 1.7 — Wave 1), already tested at their current path,
// with real consumers (reference connectors) there today. Same reasoning as
// sdk/sitemap/ and sdk/robots/: the SDK barrel unifies the import surface
// without moving already-stable, already-tested modules.
export type { IFieldMapper } from "../../mapping/IFieldMapper";
export { CsvFieldMapper } from "../../mapping/CsvFieldMapper";
export type { CsvFieldMap } from "../../mapping/CsvFieldMapper";
export { JsonFieldMapper } from "../../mapping/JsonFieldMapper";
