export enum ProviderStatus {
  /** Program ΔR — Mission ΔR-1.1. Zero runs ever recorded for this provider —
   * never assume success in the absence of evidence (the exact bug this
   * Mission fixes: an empty sample used to report Healthy/100). */
  NeverStarted = "never_started",
  Healthy = "healthy",
  Degraded = "degraded",
  Down = "down",
}
