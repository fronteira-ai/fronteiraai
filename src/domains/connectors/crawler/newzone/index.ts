import { connectorRegistry } from "../../services/ConnectorRegistry";
import { NewZoneConnector } from "./connector";

export { NewZoneConnector } from "./connector";
export { NEW_ZONE_CONFIG } from "./config";
export { familyToOffer, fetchFamiliesByCategory } from "./family-mapper";

// Auto-register on import
const instance = new NewZoneConnector();
connectorRegistry.register(instance);
