/**
 * Trust validators — assertion-based tests (no test runner required).
 * Type-checked by tsc. Run with: npx ts-node src/domains/trust/tests/trust.validators.test.ts
 */
import {
  validateStatusTransition,
  validateTrustScore,
  validateBadgeForStatus,
  validateVerificationType,
  validateRejectionReason,
  validateEventInput,
  validateVerificationBody,
} from "../validators/trust.validators";
import { TrustStatus, TrustBadge, VerificationType, TrustEventType, TrustSource } from "../types/enums";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

function run() {
  // validateStatusTransition
  assert(validateStatusTransition(TrustStatus.Unverified, TrustStatus.Pending).valid, "unverified → pending");
  assert(validateStatusTransition(TrustStatus.Pending, TrustStatus.Verified).valid, "pending → verified");
  assert(validateStatusTransition(TrustStatus.Verified, TrustStatus.Suspended).valid, "verified → suspended");
  assert(!validateStatusTransition(TrustStatus.Verified, TrustStatus.Pending).valid, "verified → pending blocked");
  assert(!validateStatusTransition(TrustStatus.Unverified, TrustStatus.Verified).valid, "unverified → verified blocked");
  console.log("✓ validateStatusTransition");

  // validateTrustScore
  assert(validateTrustScore(0).valid, "score 0 valid");
  assert(validateTrustScore(100).valid, "score 100 valid");
  assert(validateTrustScore(50).valid, "score 50 valid");
  assert(!validateTrustScore(-1).valid, "score -1 invalid");
  assert(!validateTrustScore(101).valid, "score 101 invalid");
  assert(!validateTrustScore(50.5).valid, "score 50.5 invalid (non-integer)");
  console.log("✓ validateTrustScore");

  // validateBadgeForStatus
  assert(validateBadgeForStatus(TrustBadge.Verified, TrustStatus.Verified).valid, "Verified badge + Verified status ok");
  assert(validateBadgeForStatus(TrustBadge.Premium, TrustStatus.Verified).valid, "Premium badge + Verified status ok");
  assert(!validateBadgeForStatus(TrustBadge.Verified, TrustStatus.Unverified).valid, "Verified badge + Unverified blocked");
  assert(!validateBadgeForStatus(TrustBadge.Premium, TrustStatus.Suspended).valid, "Premium badge + Suspended blocked");
  console.log("✓ validateBadgeForStatus");

  // validateVerificationType
  Object.values(VerificationType).forEach((type) => {
    assert(validateVerificationType(type).valid, `valid type: ${type}`);
  });
  assert(!validateVerificationType("invalid_type").valid, "invalid type blocked");
  console.log("✓ validateVerificationType (all types including Sprint 1.5.2)");

  // validateRejectionReason
  assert(validateRejectionReason("Documento ilegível").valid, "valid reason");
  assert(!validateRejectionReason("").valid, "empty reason blocked");
  assert(!validateRejectionReason("   ").valid, "whitespace reason blocked");
  assert(!validateRejectionReason(undefined).valid, "undefined reason blocked");
  assert(!validateRejectionReason("a".repeat(501)).valid, "too-long reason blocked");
  console.log("✓ validateRejectionReason");

  // validateEventInput
  assert(validateEventInput({ merchant_id: "m-001", event_type: TrustEventType.MerchantViewed, source: TrustSource.Buyer }).valid, "valid event");
  assert(!validateEventInput({ event_type: TrustEventType.MerchantViewed, source: TrustSource.Buyer }).valid, "missing merchant_id");
  assert(!validateEventInput({ merchant_id: "m-001", event_type: "unknown", source: TrustSource.Buyer }).valid, "invalid event_type");
  assert(!validateEventInput({ merchant_id: "m-001", event_type: TrustEventType.MerchantViewed, source: "unknown" }).valid, "invalid source");
  console.log("✓ validateEventInput");

  // validateVerificationBody
  assert(validateVerificationBody({ verification_type: "document" }).valid, "valid body");
  assert(!validateVerificationBody(null).valid, "null body blocked");
  assert(!validateVerificationBody({}).valid, "body without type blocked");
  assert(!validateVerificationBody({ verification_type: "selfie" }).valid, "invalid type blocked");
  console.log("✓ validateVerificationBody");

  console.log("\n✅ All validator tests passed\n");
}

run();
