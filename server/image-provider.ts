/**
 * Image-generation provider boundary.
 *
 * Studio code never imports a vendor SDK directly — it goes through this
 * small ImageProvider interface. Each provider records its own
 * providerId/modelId provenance on the AssetVariant so later cost
 * analysis and reuse decisions are possible.
 *
 * The Singularity adapter is a deliberate fail-closed STUB: the real private
 * API contract is not available in this repository, so it does not guess
 * endpoints, auth headers, request bodies, or response schemas. Until Brandon
 * supplies the actual contract (see docs/singularity-integration.md), every
 * generate() attempt reports MISSING_SINGULARITY_INTEGRATION BEFORE making
 * any network request. When the real docs arrive, implement exactly that
 * contract — no hypotheticals.
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
// ONLY reachable through explicit IMAGE_PROVIDER=mock configuration.
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
// Singularity adapter — fail-closed stub.
//
// No schema guesses. The constructor accepts optional config so the seam is
// ready, but generate() always throws MISSING_SINGULARITY_INTEGRATION until
// the real private contract is supplied and this method is implemented to
// match it exactly.
// ---------------------------------------------------------------------------

export interface SingularityConfig {
  /** Reserved for the real integration: full HTTPS image-generation endpoint. */
  apiUrl?: string;
  /** Reserved for the real integration: bearer key (server-side only). */
  apiKey?: string;
  /** Model id to record in provenance once wired. */
  modelId?: string;
}

export class SingularityProvider implements ImageProvider {
  readonly id = "singularity";
  readonly defaultModelId: string;

  constructor(cfg: SingularityConfig = {}) {
    this.defaultModelId = cfg.modelId ?? process.env.SINGULARITY_MODEL_ID ?? "singularity-default";
  }

  async generate(_req: ImageGenerateRequest): Promise<ImageGenerateResult> {
    // Fail-closed stub. The private Singularity contract is not available in
    // this repository; we refuse to invent one. No network request is made.
    // Implement exactly the supplied contract here when it arrives (see
    // docs/singularity-integration.md for the concrete items needed).
    throw missingIntegrationError(
      "Singularity integration is not wired: the private API contract is unavailable, " +
        "so no request was made (we do not guess vendor schemas). Provide the endpoint, auth, " +
        "request/response contract, and model ids (see docs/singularity-integration.md), then " +
        "implement SingularityProvider.generate() to match. SINGULARITY_API_URL / " +
        "SINGULARITY_API_KEY will be consumed server-side only.",
    );
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

/**
 * Resolve which provider to use.
 *
 * - IMAGE_PROVIDER=mock  -> mock (explicit test/dev only)
 * - Anything else -> Singularity adapter, which is a fail-closed stub that
 *   throws MISSING_SINGULARITY_INTEGRATION (surfaced as 503) on generate.
 *   We never silently fall back to the mock in a real environment.
 */
export function resolveProvider(): ImageProvider {
  const forced = process.env.IMAGE_PROVIDER;
  if (forced === "mock") return new MockImageProvider();
  return new SingularityProvider();
}
