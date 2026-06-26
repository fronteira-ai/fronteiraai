// Import all connectors here to trigger their auto-registration in connectorRegistry.
// This file must be imported by any API route or script that calls connectorRegistry.get().

// Reference connectors (for testing / dry-run)
import "./json-file.connector";
import "./csv-file.connector";

// Production connectors
import "./shoppingchina/index";
