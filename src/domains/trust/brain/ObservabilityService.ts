import type { CognitiveBrainEvent } from "./BrainEvent";
import type { EventQualityResult } from "./EventQualityValidator";

export type LogLevel = "info" | "warn" | "error";

export interface StructuredLog {
  level: LogLevel;
  service: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, boolean>;
  latencyMs: number;
  timestamp: string;
}

export class ObservabilityService {
  private readonly logs: StructuredLog[] = [];
  private readonly serviceName: string;

  constructor(serviceName = "trust-domain") {
    this.serviceName = serviceName;
  }

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: StructuredLog = {
      level,
      service: this.serviceName,
      message,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    };
    this.logs.push(entry);

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.serviceName}]`;
    if (level === "error") {
      console.error(prefix, message, metadata ?? "");
    } else if (level === "warn") {
      console.warn(prefix, message, metadata ?? "");
    } else {
      console.log(prefix, message, metadata ?? "");
    }
  }

  trackEvent(event: CognitiveBrainEvent, quality: EventQualityResult): void {
    const meta = {
      correlation_id: event.correlation_id,
      event_type: event.event_type,
      merchant_id: event.merchant_id,
      assets_count: event.assets_impacted.length,
      valid: quality.valid,
      warnings: quality.warnings.length,
    };

    if (!quality.valid) {
      this.log("error", `Brain event rejected: ${event.event_type}`, {
        ...meta,
        errors: quality.errors,
      });
    } else if (quality.warnings.length > 0) {
      this.log("warn", `Brain event ingested with warnings: ${event.event_type}`, {
        ...meta,
        warnings: quality.warnings,
      });
    } else {
      this.log("info", `Brain event ingested: ${event.event_type}`, meta);
    }
  }

  getRecentLogs(limit = 50): StructuredLog[] {
    return this.logs.slice(-limit);
  }

  buildHealthCheck(checks: Record<string, boolean>, latencyMs: number): HealthCheckResult {
    const failedChecks = Object.values(checks).filter((v) => !v).length;
    const status: HealthCheckResult["status"] =
      failedChecks === 0 ? "healthy" : failedChecks < Object.keys(checks).length ? "degraded" : "unhealthy";

    return {
      status,
      checks,
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  }
}
