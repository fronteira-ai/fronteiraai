// Import all connectors here to trigger their auto-registration in connectorRegistry.
// This file must be imported (or bootstrapConnectors() called) before anything
// calls connectorRegistry.get()/list().

// Reference connectors (for testing / dry-run)
import "./reference/JsonFileConnector";
import "./reference/CsvFileConnector";

// Production connectors
import "./shoppingchina/index";

let bootstrapped = false;

export function bootstrapConnectors(): void {
  // The imports above already ran once per process — this flag just documents
  // intent and mirrors the idempotent-bootstrap pattern used by other domains
  // (e.g. growth-engine's bootstrapStrategies).
  bootstrapped = true;
}

export function isBootstrapped(): boolean {
  return bootstrapped;
}
