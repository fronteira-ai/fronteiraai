import fs from "fs";
import type { IConnector, ConnectorMetadata } from "../types/connector";
import type { ConnectorBatch } from "../types/raw";
import { JSONParser } from "../parsers/json.parser";

export interface JsonFileConnectorOptions {
  filePath: string;
  storeSlug: string;
  id?: string;
  name?: string;
  version?: string;
}

export class JsonFileConnector implements IConnector {
  readonly metadata: ConnectorMetadata;
  private readonly parser = new JSONParser();

  constructor(private readonly options: JsonFileConnectorOptions) {
    this.metadata = {
      id: options.id ?? `json-file:${options.storeSlug}`,
      name: options.name ?? `JSON File — ${options.storeSlug}`,
      version: options.version ?? "1.0",
      type: "json-file",
      storeSlug: options.storeSlug,
    };
  }

  async fetch(): Promise<ConnectorBatch> {
    const content = fs.readFileSync(this.options.filePath, "utf8");
    return this.parser.parse(content, this.metadata.id, this.options.storeSlug);
  }
}
