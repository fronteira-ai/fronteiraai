import { connectorRegistry } from "../../services/ConnectorRegistry";
import { AtacadoConnectConnector } from "./connector";

export { AtacadoConnectConnector } from "./connector";
export { ATACADO_CONNECT_CONFIG } from "./config";
export type { ListingProduct } from "./listing-parser";

const instance = new AtacadoConnectConnector();
connectorRegistry.register(instance);
