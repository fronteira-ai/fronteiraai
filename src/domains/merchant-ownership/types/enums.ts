// Release 1.7 — Wave 5 — Merchant Acquisition & Ownership Platform.

export enum ClaimStatus {
  Pending = "pending",
  AwaitingReview = "awaiting_review",
  Approved = "approved",
  Rejected = "rejected",
  Cancelled = "cancelled",
}

// Epic D — Ownership Levels. Deliberately never stored as a column: derived
// on read from state that already exists elsewhere (merchant_stores
// presence, verification status, merchant.plan), same "computed on demand"
// convention used by every score/status in this codebase (Merchant Score,
// Catalog Health, etc.) — avoids a second source of truth that can drift.
export enum OwnershipLevel {
  StoreDiscovered = "store_discovered",
  ClaimRequested = "claim_requested",
  IdentityVerified = "identity_verified",
  OwnershipVerified = "ownership_verified",
  MerchantVerified = "merchant_verified",
  PremiumMerchant = "premium_merchant",
}

// Epic E — Delegated Management. Ownership (the `merchants` row itself,
// tied to one auth user) is never delegated — only management permissions
// are. A delegate always acts through the same merchant record, scoped by
// role, and can never invite or revoke other delegates.
export enum DelegateRole {
  Manager = "manager",
  Marketing = "marketing",
  Agency = "agency",
  Administrator = "administrator",
  Operator = "operator",
}

export enum DelegateStatus {
  Invited = "invited",
  Active = "active",
  Revoked = "revoked",
}

export enum Permission {
  ViewDashboard = "view_dashboard",
  ManageCatalog = "manage_catalog",
  ManageImports = "manage_imports",
  ManageSettings = "manage_settings",
  ManageDelegates = "manage_delegates",
  ViewAnalytics = "view_analytics",
  ManageGrowth = "manage_growth",
}

// Fixed permission matrix per role (v1) — not per-delegate custom grants.
// Only Administrator gets ManageDelegates; ownership (inviting/revoking
// delegates) is never itself delegatable to a non-Administrator role, and
// even Administrator delegates are distinct from the owner (see
// DelegationService — only the owner's own merchant record can invite).
export const ROLE_PERMISSIONS: Record<DelegateRole, Permission[]> = {
  [DelegateRole.Administrator]: [
    Permission.ViewDashboard,
    Permission.ManageCatalog,
    Permission.ManageImports,
    Permission.ManageSettings,
    Permission.ManageDelegates,
    Permission.ViewAnalytics,
    Permission.ManageGrowth,
  ],
  [DelegateRole.Manager]: [
    Permission.ViewDashboard,
    Permission.ManageCatalog,
    Permission.ManageImports,
    Permission.ViewAnalytics,
    Permission.ManageGrowth,
  ],
  [DelegateRole.Marketing]: [Permission.ViewDashboard, Permission.ViewAnalytics, Permission.ManageGrowth],
  [DelegateRole.Agency]: [
    Permission.ViewDashboard,
    Permission.ManageCatalog,
    Permission.ManageImports,
    Permission.ViewAnalytics,
  ],
  [DelegateRole.Operator]: [Permission.ViewDashboard, Permission.ManageCatalog],
};
