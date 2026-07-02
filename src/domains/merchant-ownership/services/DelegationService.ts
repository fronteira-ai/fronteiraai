import { randomUUID } from "crypto";
import type { MerchantDelegate } from "../domain/MerchantDelegate";
import { DelegateRole, DelegateStatus, Permission, ROLE_PERMISSIONS } from "../types/enums";
import type { IMerchantDelegateRepository } from "../repositories/IMerchantDelegateRepository";
import type { EventService } from "@/src/domains/trust/services/EventService";
import { managerAcceptedEvent, managerInvitedEvent, toCreateEventInput } from "../events/merchant-ownership.events";

export type ActingRole = "owner" | DelegateRole;

// Epic E — Delegated Management. "Nunca confundir proprietário com
// administrador": ownership (the `merchants` row, tied to one auth user) is
// never delegated — only management permissions are. The owner check here
// is defensive, not just a side effect of which auth guard an API route
// happens to call — a delegate can never invite or revoke another delegate,
// enforced in the service itself and tested explicitly.
export class DelegationService {
  constructor(
    private readonly delegateRepo: IMerchantDelegateRepository,
    private readonly eventService: EventService
  ) {}

  async invite(
    merchantId: string,
    actingRole: ActingRole,
    invitedEmail: string,
    role: DelegateRole,
    invitedByUserId: string
  ): Promise<MerchantDelegate> {
    if (actingRole !== "owner") {
      throw new Error("Apenas o proprietário da loja pode convidar delegados.");
    }

    const delegate = await this.delegateRepo.create({
      merchantId,
      invitedEmail,
      role,
      inviteToken: randomUUID(),
      invitedBy: invitedByUserId,
    });

    await this.eventService.recordEvent(toCreateEventInput(managerInvitedEvent(merchantId, delegate.id, role)));

    return delegate;
  }

  async accept(inviteToken: string, userId: string): Promise<MerchantDelegate | null> {
    const delegate = await this.delegateRepo.findByToken(inviteToken);
    if (!delegate || delegate.status !== DelegateStatus.Invited) return null;

    await this.delegateRepo.accept(delegate.id, userId);
    await this.eventService.recordEvent(toCreateEventInput(managerAcceptedEvent(delegate.merchantId, delegate.id)));

    return this.delegateRepo.findById(delegate.id);
  }

  async revoke(delegateId: string, requestingMerchantId: string, actingRole: ActingRole): Promise<boolean> {
    if (actingRole !== "owner") {
      throw new Error("Apenas o proprietário da loja pode revogar delegados.");
    }

    const delegate = await this.delegateRepo.findById(delegateId);
    if (!delegate || delegate.merchantId !== requestingMerchantId) return false;

    await this.delegateRepo.updateStatus(delegateId, DelegateStatus.Revoked);
    return true;
  }

  listForMerchant(merchantId: string): Promise<MerchantDelegate[]> {
    return this.delegateRepo.findByMerchantId(merchantId);
  }

  resolveActiveDelegate(userId: string): Promise<MerchantDelegate | null> {
    return this.delegateRepo.findActiveByUserId(userId);
  }

  getPermissions(role: DelegateRole): Permission[] {
    return ROLE_PERMISSIONS[role];
  }
}
