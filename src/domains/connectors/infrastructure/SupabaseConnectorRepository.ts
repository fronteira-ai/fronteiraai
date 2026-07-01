import type { SupabaseClient } from "@supabase/supabase-js";
import type { IConnectorRepository } from "../repositories/IConnectorRepository";
import type { Connector } from "../domain/Connector";
import type { ConnectorMetadata } from "../types/connector.types";
import { ConnectorStatus } from "../types/enums";

function toConnector(row: Record<string, unknown>): Connector {
  return {
    id: row.id as string,
    connectorKey: row.connector_key as string,
    name: row.name as string,
    version: row.version as string,
    type: row.type as Connector["type"],
    storeSlug: row.store_slug as string,
    description: (row.description as string | null) ?? null,
    status: row.status as ConnectorStatus,
    config: (row.config as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class SupabaseConnectorRepository implements IConnectorRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsertFromMetadata(metadata: ConnectorMetadata): Promise<Connector | null> {
    const { data, error } = await this.client
      .from("connectors")
      .upsert(
        {
          connector_key: metadata.id,
          name: metadata.name,
          version: metadata.version,
          type: metadata.type,
          store_slug: metadata.storeSlug,
          description: metadata.description ?? null,
        },
        { onConflict: "connector_key" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("[SupabaseConnectorRepository.upsertFromMetadata]", error.message);
      return null;
    }
    return toConnector(data as Record<string, unknown>);
  }

  async findByKey(connectorKey: string): Promise<Connector | null> {
    const { data, error } = await this.client
      .from("connectors")
      .select("*")
      .eq("connector_key", connectorKey)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseConnectorRepository.findByKey]", error.message);
      return null;
    }
    return data ? toConnector(data as Record<string, unknown>) : null;
  }

  async findById(id: string): Promise<Connector | null> {
    const { data, error } = await this.client.from("connectors").select("*").eq("id", id).maybeSingle();

    if (error) {
      console.error("[SupabaseConnectorRepository.findById]", error.message);
      return null;
    }
    return data ? toConnector(data as Record<string, unknown>) : null;
  }

  async list(): Promise<Connector[]> {
    const { data, error } = await this.client.from("connectors").select("*").order("created_at", { ascending: true });

    if (error) {
      console.error("[SupabaseConnectorRepository.list]", error.message);
      return [];
    }
    return (data ?? []).map((row) => toConnector(row as Record<string, unknown>));
  }

  async updateStatus(id: string, status: ConnectorStatus): Promise<Connector | null> {
    const { data, error } = await this.client
      .from("connectors")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[SupabaseConnectorRepository.updateStatus]", error.message);
      return null;
    }
    return toConnector(data as Record<string, unknown>);
  }
}
