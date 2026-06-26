import fs from "fs";
import type { IConnector, ConnectorMetadata } from "../types/connector";
import type { ConnectorBatch } from "../types/raw";
import { CSVParser, type CsvFieldMap } from "../parsers/csv.parser";

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
  private readonly parser: CSVParser;

  constructor(private readonly options: CsvFileConnectorOptions) {
    this.metadata = {
      id: options.id ?? `csv-file:${options.storeSlug}`,
      name: options.name ?? `CSV File — ${options.storeSlug}`,
      version: options.version ?? "1.0",
      type: "csv-file",
      storeSlug: options.storeSlug,
    };
    this.parser = new CSVParser(options.fieldMap);
  }

  async fetch(): Promise<ConnectorBatch> {
    const content = fs.readFileSync(this.options.filePath, "utf8");
    return this.parser.parse(content, this.metadata.id, this.options.storeSlug);
  }
}
