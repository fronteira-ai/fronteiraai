import fs from "fs";
import path from "path";
import type { IConnector, ConnectorMetadata } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { CsvFieldMapper, type CsvFieldMap } from "../../mapping/CsvFieldMapper";
import { connectorRegistry } from "../../services/ConnectorRegistry";

export interface CsvFileConnectorOptions {
  filePath: string;
  storeSlug: string;
  fieldMap?: CsvFieldMap;
  id?: string;
  name?: string;
  version?: string;
}

export class CsvFileConnector implements IConnector {
  readonly metadata: ConnectorMetadata;
  private readonly mapper: CsvFieldMapper;

  constructor(private readonly options: CsvFileConnectorOptions) {
    this.metadata = {
      id: options.id ?? `csv-file:${options.storeSlug}`,
      name: options.name ?? `CSV File — ${options.storeSlug}`,
      version: options.version ?? "1.0",
      type: ConnectorType.CsvFile,
      storeSlug: options.storeSlug,
    };
    this.mapper = new CsvFieldMapper(options.fieldMap);
  }

  async fetch(): Promise<ConnectorBatch> {
    const content = fs.readFileSync(this.options.filePath, "utf8");
    return this.mapper.parse(content, this.metadata.id, this.options.storeSlug);
  }
}

// Reference connector used by the sample-data CLI scripts (scripts/import-csv.ts)
// and available for dry-run testing from the admin/merchant import UI.
connectorRegistry.register(
  new CsvFileConnector({
    filePath: path.join(process.cwd(), "scripts", "datasets", "sample-products.csv"),
    storeSlug: "nissei",
    id: "csv-file:sample",
    name: "Sample CSV Import",
  })
);
