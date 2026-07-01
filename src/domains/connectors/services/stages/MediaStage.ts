import https from "https";
import http from "http";
import type { NormalizedOffer, PipelineContext } from "../../types/pipeline.types";
import type { ISyncStage } from "./ISyncStage";
import { recordStage, recordError } from "../metrics";

const SUPABASE_STORAGE_RE = /\.supabase\.co\/storage\//;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const CATALOG_BUCKET = "catalog";

export class MediaStage implements ISyncStage {
  readonly name = "media";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (ctx.dryRun) {
      // In dry-run mode, resolve image URLs without downloading.
      ctx.normalized = ctx.normalized.map((n) => ({
        ...n,
        resolvedImageUrl: n.product.imageUrl,
      }));
      recordStage(ctx, this.name, new Date().toISOString(), ctx.normalized.length, 0);
      return ctx;
    }

    const startedAt = new Date().toISOString();
    let accepted = 0;
    let skipped = 0;

    const processed: NormalizedOffer[] = [];
    for (const normalized of ctx.normalized) {
      try {
        const resolved = await this.processImage(ctx, normalized);
        processed.push({ ...normalized, resolvedImageUrl: resolved });
        if (resolved) accepted++; else skipped++;
      } catch (err) {
        recordError(ctx, this.name, String(err), normalized.product.slug);
        processed.push({ ...normalized, resolvedImageUrl: null });
        skipped++;
      }
    }

    ctx.normalized = processed;
    recordStage(ctx, this.name, startedAt, accepted, 0, skipped);
    return ctx;
  }

  private async processImage(ctx: PipelineContext, n: NormalizedOffer): Promise<string | null> {
    const url = n.product.imageUrl;
    if (!url) return null;

    // Already hosted in Supabase Storage — use as-is.
    if (SUPABASE_STORAGE_RE.test(url)) return url;

    const buffer = await this.download(url);
    if (!buffer) return null;

    const storagePath = `products/${n.product.slug}/main.webp`;

    let uploadBuffer: Buffer = buffer;

    // Convert to WebP if sharp is available.
    try {
      const sharp = (await import("sharp")).default;
      uploadBuffer = await sharp(buffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      // sharp not installed or conversion failed — upload original.
    }

    // Storage is not a table-write concern covered by ICatalogRepository —
    // this is the one accepted exception where a stage still touches a raw
    // SupabaseClient directly (see PipelineContext.storage).
    const { error } = await ctx.storage.storage
      .from(CATALOG_BUCKET)
      .upload(storagePath, uploadBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) {
      console.warn(`[media] upload failed for ${n.product.slug}: ${error.message}`);
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return `${supabaseUrl}/storage/v1/object/public/${CATALOG_BUCKET}/${storagePath}`;
  }

  private download(url: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const client = url.startsWith("https") ? https : http;
      const chunks: Buffer[] = [];
      let total = 0;

      const req = client.get(url, { timeout: 10_000 }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.destroy();
          resolve(null);
          return;
        }

        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_IMAGE_BYTES) {
            res.destroy();
            resolve(null);
            return;
          }
          chunks.push(chunk);
        });

        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      });

      req.on("error", () => resolve(null));
      req.on("timeout", () => { req.destroy(); resolve(null); });
    });
  }
}
