import { connectorRegistry } from "../../services/ConnectorRegistry";
import { TopDekConnector } from "./connector";

export { TopDekConnector } from "./connector";
export { TOPDEK_CONFIG } from "./config";
export type { ListingProduct } from "./listing-parser";

// Auto-register on import
const instance = new TopDekConnector();
connectorRegistry.register(instance);
