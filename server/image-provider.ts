/**
 * Image-generation provider boundary.
 *
 * Studio code never imports a vendor SDK directly — it goes through this
 * small ImageProvider interface. Each provider records its own
 * providerId/modelId provenance on the AssetVariant so later cost
 * analysis and reuse decisions are possible.
 *
 * The Singularity adapter below is intentionally thin: it reads a server-side
 * key from env and delegates to the vendor. Because the real private API
 * contract is not available in this repository, it requires the operator to
 * supply SINGULARITY_API_URL (the full image-generation endpoint) and
 * SINGULARITY_API_KEY. If either is absent the adapter throws a descriptive
 * error pointing at the concrete missing information instead of pretending to
 * know the endpoint. See docs/singularity-integration.md.
 */

export interface ImageGenerateRequest {
  prompt: string;
  width?: number;
  height?: number;
}

export interface ImageGenerateResult {
  buffer: Buffer;
  mimeType: string; // e.g. "image/png"
  width?: number;
  height?: number;
  providerId: string;
  modelId: string;
  providerRequestId?: string;
}

export interface ImageProvider {
  /** Stable id persisted to AssetVariant.provider_id (e.g. "singularity", "mock"). */
  readonly id: string;
  /** Default model recorded in provenance when the caller omits one. */
  readonly defaultModelId: string;
  generate(req: ImageGenerateRequest): Promise<ImageGenerateResult>;
}

// ---------------------------------------------------------------------------
// Mock (test / dev) provider — returns a 1x1 PNG without any network call.
// Tests must never make a paid generation call, so they use this.
// ---------------------------------------------------------------------------

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

export class MockImageProvider implements ImageProvider {
  readonly id = "mock";
  readonly defaultModelId = "mock-v1";

  async generate(req: ImageGenerateRequest): Promise<ImageGenerateResult> {
    if (!req.prompt || !req.prompt.trim()) {
      throw new Error("prompt is required");
    }
    return {
      buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
      mimeType: "image/png",
      width: req.width ?? 512,
      height: req.height ?? 512,
      providerId: this.id,
      modelId: this.defaultModelId,
    };
  }
}

// ---------------------------------------------------------------------------
// Singularity adapter. Deliberately DOES NOT hard-code the private endpoint.
// ---------------------------------------------------------------------------

export interface SingularityConfig {
  /** Full HTTPS endpoint to POST image-generation requests to. */
  apiUrl?: string;
  /** Bearer key for Singularity. Must stay server-side. */
  apiKey?: string;
  /** Model id to record in provenance (e.g. "singularity-raster-v1"). */
  modelId?: string;
}

export class SingularityProvider implements ImageProvider {
  readonly id = "singularity";
  readonly defaultModelId: string;
  private readonly apiUrl: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(cfg: SingularityConfig = {}) {
    this.apiUrl = cfg.apiUrl ?? process.env.SINGULARITY_API_URL;
    this.apiKey = cfg.apiKey ?? process.env.SINGULARITY_API_KEY;
    this.defaultModelId = cfg.modelId ?? process.env.SINGULARITY_MODEL_ID ?? "singularity-default";
  }

  async generate(req: ImageGenerateRequest): Promise<ImageGenerateResult> {
    if (!req.prompt || !req.prompt.trim()) throw new Error("prompt is required");
    if (!this.apiUrl) {
      throw missingIntegrationError(
        "SINGULARITY_API_URL is not set. " +
          "Set it to the full Singularity image-generation endpoint (e.g. https://api.singularity.example/v1/images/generate). " +
          "See docs/singularity-integration.md for the expected request/response contract.",
      );
    }
    if (!this.apiKey) {
      throw missingIntegrationError("SINGULARITY_API_KEY is not set. Provide it via environment — never commit it.");
    }

    const body = JSON.stringify({
      prompt: req.prompt,
      width: req.width ?? 1024,
      height: req.height ?? 1024,
      model: this.defaultModelId,
    });

    let res: Response;
    try {
      res = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
      });
    } catch (e) {
      throw new Error(
        `Singularity request failed to reach ${this.apiUrl}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Singularity generation failed (${res.status}): ${text.slice(0, 800)}`);
    }

    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json) throw new Error("Singularity returned non-JSON");

    let buffer: Buffer | null = null;
    let mimeType = "image/png";
    let width = req.width;
    let height = req.height;
    let requestId: string | undefined;

    if (typeof json["imageBase64"] === "string") {
      buffer = Buffer.from(json["imageBase64"] as string, "base64");
      if (typeof json["mimeType"] === "string") mimeType = json["mimeType"] as string;
      if (typeof json["width"] === "number") width = json["width"] as number;
      if (typeof json["height"] === "number") height = json["height"] as number;
      if (typeof json["requestId"] === "string") requestId = json["requestId"] as string;
      if (typeof json["id"] === "string") requestId = json["id"] as string;
    } else if (
      Array.isArray(json["data"]) &&
      json["data"][0] &&
      typeof (json["data"][0] as Record<string, unknown>)["b64_json"] === "string"
    ) {
      const first = json["data"][0] as Record<string, unknown>;
      buffer = Buffer.from(first["b64_json"] as string, "base64");
      mimeType = "image/png";
    } else if (typeof json["b64_json"] === "string") {
      buffer = Buffer.from(json["b64_json"] as string, "base64");
    }

    if (!buffer) {
      throw new Error(
        `Singularity response shape unrecognized. Expected { imageBase64 } or { data:[{b64_json}] }. Got keys: ${Object.keys(json).join(", ")}. See docs/singularity-integration.md.`,
      );
    }

    return {
      buffer,
      mimeType,
      width,
      height,
      providerId: this.id,
      modelId: this.defaultModelId,
      providerRequestId: requestId,
    };
  }
}

function missingIntegrationError(message: string): Error {
  const err = new Error(message);
  (err as unknown as { code?: string }).code = "MISSING_SINGULARITY_INTEGRATION";
  return err;
}

/** True when the error is the "missing integration" sentinel above. */
export function isMissingIntegration(err: unknown): boolean {
  return err instanceof Error && (err as unknown as { code?: string }).code === "MISSING_SINGULARITY_INTEGRATION";
}

/** Resolve which provider to use. Default is mock when no env is configured (tests / dev). */
export function resolveProvider(): ImageProvider {
  const forced = process.env.IMAGE_PROVIDER;
  if (forced === "mock") return new MockImageProvider();
  if (forced === "singularity") return new SingularityProvider();
  if (process.env.SINGULARITY_API_URL && process.env.SINGULARITY_API_KEY) {
    return new SingularityProvider();
  }
  return new MockImageProvider();
}
