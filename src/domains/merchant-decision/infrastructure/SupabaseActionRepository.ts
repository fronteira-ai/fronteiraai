import type { SupabaseClient } from "@supabase/supabase-js";
import type { IActionRepository, CreateActionInput, UpdateActionInput } from "../repositories/IActionRepository";
import type { DecisionAction } from "../types/decision.types";
import { ActionStatus } from "../types/enums";

export class SupabaseActionRepository implements IActionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateActionInput): Promise<DecisionAction | null> {
    const { data, error } = await this.client
      .from("merchant_decision_actions")
      .insert({
        merchant_id: input.merchant_id,
        rule_id: input.rule_id,
        recommendation_id: input.recommendation_id,
        title: input.title,
        category: input.category,
        priority: input.priority,
        status: input.status ?? ActionStatus.Pending,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[SupabaseActionRepository.create]", error.message);
      return null;
    }
    return data as unknown as DecisionAction;
  }

  async findByMerchant(merchantId: string, status?: ActionStatus): Promise<DecisionAction[]> {
    let q = this.client
      .from("merchant_decision_actions")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);

    const { data, error } = await q.limit(100);
    if (error) {
      console.error("[SupabaseActionRepository.findByMerchant]", error.message);
      return [];
    }
    return (data ?? []) as unknown as DecisionAction[];
  }

  async findById(id: string): Promise<DecisionAction | null> {
    const { data, error } = await this.client
      .from("merchant_decision_actions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseActionRepository.findById]", error.message);
      return null;
    }
    return data as unknown as DecisionAction | null;
  }

  async findByRuleId(merchantId: string, ruleId: string): Promise<DecisionAction | null> {
    const { data, error } = await this.client
      .from("merchant_decision_actions")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("rule_id", ruleId)
      .in("status", [ActionStatus.Pending, ActionStatus.Postponed])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseActionRepository.findByRuleId]", error.message);
      return null;
    }
    return data as unknown as DecisionAction | null;
  }

  async update(id: string, input: UpdateActionInput): Promise<DecisionAction | null> {
    const { data, error } = await this.client
      .from("merchant_decision_actions")
      .update({
        status: input.status,
        notes: input.notes ?? null,
        acted_at: input.acted_at ?? (
          input.status === ActionStatus.Completed || input.status === ActionStatus.Ignored
            ? new Date().toISOString()
            : null
        ),
        scheduled_for: input.scheduled_for ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[SupabaseActionRepository.update]", error.message);
      return null;
    }
    return data as unknown as DecisionAction;
  }

  async getTimeline(merchantId: string, limit = 30): Promise<DecisionAction[]> {
    const { data, error } = await this.client
      .from("merchant_decision_actions")
      .select("*")
      .eq("merchant_id", merchantId)
      .not("acted_at", "is", null)
      .order("acted_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SupabaseActionRepository.getTimeline]", error.message);
      return [];
    }
    return (data ?? []) as unknown as DecisionAction[];
  }
}
