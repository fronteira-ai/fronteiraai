import { connectorRegistry } from "../../services/ConnectorRegistry";
import { MobileZoneConnector } from "./connector";

export { MobileZoneConnector } from "./connector";
export { MOBILE_ZONE_CONFIG } from "./config";

const instance = new MobileZoneConnector();
connectorRegistry.register(instance);
