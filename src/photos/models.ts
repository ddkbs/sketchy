export type ModelTier = "small" | "medium" | "large";

export type ModelInfo = {
  tier: ModelTier;
  repo: string;
  dtype: "q8" | "fp32";
  title: string;
  downloadMb: number;
  ramGb: number;
  speed: string;
  quality: string;
};

/** Florence-2 variants offered on first use; sizes measured on macOS arm64. */
export const MODELS: Record<ModelTier, ModelInfo> = {
  small: {
    tier: "small",
    repo: "onnx-community/Florence-2-base-ft",
    dtype: "q8",
    title: "Small",
    downloadMb: 280,
    ramGb: 1,
    speed: "~1 s per label",
    quality: "Good for printed text and distinct parts",
  },
  medium: {
    tier: "medium",
    repo: "onnx-community/Florence-2-large-ft",
    dtype: "q8",
    title: "Medium",
    downloadMb: 830,
    ramGb: 2.5,
    speed: "~2 s per label",
    quality: "Better grounding of small parts",
  },
  large: {
    tier: "large",
    repo: "onnx-community/Florence-2-large-ft",
    dtype: "fp32",
    title: "Large",
    downloadMb: 3100,
    ramGb: 4.5,
    speed: "~4 s per label",
    quality: "Most precise, needs a strong machine",
  },
};

export function isModelTier(value: unknown): value is ModelTier {
  return typeof value === "string" && value in MODELS;
}
