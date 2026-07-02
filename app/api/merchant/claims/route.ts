import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";
import type { StoreChannels } from "@/src/domains/merchant-ownership";

interface ClaimRequestBody {
  storeSlug?: string;
  claimantName?: string;
  claimantRole?: string;
  claimantPhone?: string;
  claimantWhatsapp?: string;
  claimantWebsite?: string;
  claimantInstagram?: string;
}

// Epic B — Smart Claim Flow. Email is always the authenticated user's own
// email, never taken from the request body — the whole point of Progressive
// Verification is comparing a claim against data the claimant doesn't
// control, so the one identity fact that must come from auth, not the form.
export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, userId, email, serviceClient } = auth;
  const body = (await request.json()) as ClaimRequestBody;

  if (!body.storeSlug || !body.claimantName || !body.claimantRole || !body.claimantPhone) {
    return NextResponse.json({ error: "Nome, cargo, telefone e loja são obrigatórios." }, { status: 400 });
  }

  const { data: store, error: storeError } = await serviceClient
    .from("stores")
    .select("id, email, phone, whatsapp, website, instagram")
    .eq("slug", body.storeSlug)
    .maybeSingle();

  if (storeError || !store) {
    return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
  }

  const storeChannels: StoreChannels = {
    email: store.email ?? null,
    phone: store.phone ?? null,
    whatsapp: store.whatsapp ?? null,
    website: store.website ?? null,
    instagram: store.instagram ?? null,
  };

  const { claimService } = createMerchantOwnershipServices(serviceClient);

  const claim = await claimService.create(
    merchant.id,
    store.id,
    {
      name: body.claimantName,
      role: body.claimantRole,
      email,
      phone: body.claimantPhone,
      whatsapp: body.claimantWhatsapp ?? null,
      website: body.claimantWebsite ?? null,
      instagram: body.claimantInstagram ?? null,
    },
    storeChannels,
    userId
  );

  return NextResponse.json({ data: claim });
}

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;
  const { claimRepo } = createMerchantOwnershipServices(serviceClient);
  const claims = await claimRepo.findByMerchantId(merchant.id);

  return NextResponse.json({ data: claims });
}
