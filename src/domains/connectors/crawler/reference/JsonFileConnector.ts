import fs from "fs";
import path from "path";
import type { IConnector, ConnectorMetadata } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { JsonFieldMapper } from "../../mapping/JsonFieldMapper";
import { connectorRegistry } from "../../services/ConnectorRegistry";
import type { ConnectorCapabilities } from "../../types/capability.types";

// Same honesty as CsvFileConnector's declaration — a JSON feed's inStock/
// currency are real mapped fields (JsonFieldMapper.ts), not hardcoded.
const JSON_CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: false,
  supportsSearch: false,
  supportsPagination: false,
  supportsImages: true,
  supportsBrands: true,
  supportsCategories: true,
  supportsStock: true,
  supportsExchange: true,
  supportsStructuredData: false,
  supportsCanonicalMatching: true,
};

export interface JsonFileConnectorOptions {
  filePath: string;
  storeSlug: string;
  id?: string;
  name?: string;
  version?: string;
}

export class JsonFileConnector implements IConnector {
  readonly metadata: ConnectorMetadata;
  private readonly mapper = new JsonFieldMapper();

  constructor(private readonly options: JsonFileConnectorOptions) {
    this.metadata = {
      id: options.id ?? `json-file:${options.storeSlug}`,
      name: options.name ?? `JSON File — ${options.storeSlug}`,
      version: options.version ?? "1.0",
      type: ConnectorType.JsonFile,
      storeSlug: options.storeSlug,
      capabilities: JSON_CAPABILITIES,
    };
  }

  async fetch(): Promise<ConnectorBatch> {
    const content = fs.readFileSync(this.options.filePath, "utf8");
    return this.mapper.parse(content, this.metadata.id, this.options.storeSlug);
  }
}

// Reference connector used by the sample-data CLI scripts (scripts/import-json.ts)
// and available for dry-run testing from the admin/merchant import UI.
// Normalizes the inconsistent self-registration pattern acquisition/ had
// (ShoppingChina self-registered on import, the file connectors did not).
connectorRegistry.register(
  new JsonFileConnector({
    filePath: path.join(process.cwd(), "scripts", "datasets", "sample-products.json"),
    storeSlug: "cellshop",
    id: "json-file:sample",
    name: "Sample JSON Import",
  })
);
