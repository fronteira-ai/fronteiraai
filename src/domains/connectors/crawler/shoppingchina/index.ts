import { connectorRegistry } from "../../services/ConnectorRegistry";
import { ShoppingChinaConnector } from "./connector";

export { ShoppingChinaConnector } from "./connector";
export { SHOPPING_CHINA_CONFIG } from "./config";
export type { ListingProduct } from "./listing-parser";

// Auto-register on import
const instance = new ShoppingChinaConnector();
connectorRegistry.register(instance);
