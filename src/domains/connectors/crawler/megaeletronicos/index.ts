import { connectorRegistry } from "../../services/ConnectorRegistry";
import { MegaEletronicosConnector } from "./connector";

export { MegaEletronicosConnector } from "./connector";
export { MEGA_ELETRONICOS_CONFIG } from "./config";
export type { ListingProduct } from "./listing-parser";

const instance = new MegaEletronicosConnector();
connectorRegistry.register(instance);
