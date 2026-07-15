import { getServiceClient } from "./lib/client";
import { SupabaseMergeCandidateRepository, SupabaseMergeExecutionRepository, MergeQueueDashboardService } from "../src/domains/canonical-catalog";

async function main() {
  const supabase = getServiceClient();
  const candidateRepo = new SupabaseMergeCandidateRepository(supabase);
  const executionRepo = new SupabaseMergeExecutionRepository(supabase);
  const service = new MergeQueueDashboardService(candidateRepo, executionRepo);
  const stats = await service.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
