export enum ConnectorType {
  JsonFile = "json-file",
  CsvFile = "csv-file",
  ApiRest = "api-rest",
  XmlFile = "xml-file",
  Erp = "erp",
  ManualUpload = "manual-upload",
  Crawler = "crawler",
}

export enum ConnectorStatus {
  Active = "active",
  Disabled = "disabled",
}

export enum SyncRunStatus {
  Running = "running",
  Success = "success",
  Partial = "partial",
  Failed = "failed",
}
