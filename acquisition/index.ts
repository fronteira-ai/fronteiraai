// Public API of the Acquisition Engine.
// Import from here to build new connectors or integrate with the pipeline.

export type { IConnector, ConnectorMetadata, ConnectorType } from "./types/connector";
export type { RawOffer, RawProduct, ConnectorBatch } from "./types/raw";
export type {
  NormalizedOffer,
  DeduplicatedOffer,
  PipelineContext,
  PipelineResult,
  PipelineMetrics,
  PersistenceResult,
  IPipelineStage,
} from "./types/pipeline";
export type { ValidationResult, ValidationError, ValidationWarning } from "./types/validation";

export { AcquisitionPipeline } from "./core/pipeline";
export { connectorRegistry } from "./core/registry";
export { JSONParser } from "./parsers/json.parser";
export { CSVParser } from "./parsers/csv.parser";
export { ValidationEngine } from "./engines/validation.engine";
export { NormalizationEngine } from "./engines/normalization.engine";
export { DeduplicationEngine } from "./engines/deduplication.engine";
export { CanonicalProductEngine } from "./engines/canonical.engine";
export { MediaPipeline } from "./engines/media.engine";
export { CatalogWriter } from "./persistence/catalog.writer";
export { JsonFileConnector } from "./connectors/json-file.connector";
export { CsvFileConnector } from "./connectors/csv-file.connector";
