import { cache } from "react";
import { getStorePublic } from "@/services/stores-public.service";

export const getCachedStorePublic = cache(getStorePublic);
