import { connectorRegistry } from "../../services/ConnectorRegistry";
import { RomaShoppingConnector } from "./connector";

export { RomaShoppingConnector } from "./connector";
export { ROMA_SHOPPING_CONFIG } from "./config";

const instance = new RomaShoppingConnector();
connectorRegistry.register(instance);
