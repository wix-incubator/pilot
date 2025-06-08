import { reviewConfigsToOutputsMapping } from "@/performers/auto-performer/reviews/reviews-utils";
import { AutoReviewSectionConfig } from "@/types";

export type Output = {
  tag: string;
  isRequired: boolean;
};

export type OutputsMapping = Record<string, Output>;

type ExtractedType<M extends OutputsMapping> = {
  [K in keyof M]: M[K]["isRequired"] extends true ? string : string | "";
};

const BASE_AUTOPILOT_STEP = {
  screenDescription: { tag: "SCREENDESCRIPTION", isRequired: true },
  thoughts: { tag: "THOUGHTS", isRequired: true },
  action: { tag: "ACTION", isRequired: true },
  goalSummary: { tag: "GOAL_SUMMARY", isRequired: false },
};

const AUTOPILOT_REVIEW_SECTION = {
  summary: { tag: "SUMMARY", isRequired: false },
  findings: { tag: "FINDINGS", isRequired: false },
  score: { tag: "SCORE", isRequired: false },
};

const PILOT_OUTPUTS = {
  cacheValidationMatcher: {
    tag: "CACHE_VALIDATION_MATCHER",
    isRequired: false,
  },
  code: { tag: "CODE", isRequired: true },
};

function extractTaggedOutputs<M extends OutputsMapping>({
  text,
  outputsMapper,
}: {
  text: string;
  outputsMapper: M;
}): ExtractedType<M> {
  const entries: [keyof M, string | undefined][] = [];

  for (const key of Object.keys(outputsMapper) as (keyof M)[]) {
    const { tag, isRequired } = outputsMapper[key];
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
    const match = text.match(regex);

    if (match) {
      const content = match[1].trim();
      entries.push([key, content]);
      text = text.replace(match[0], "");
    } else if (!isRequired) {
      entries.push([key, undefined]);
    } else {
      throw new Error(`Missing field for required tag <${tag}>`);
    }
  }

  return Object.fromEntries(entries) as ExtractedType<M>;
}

/**
 * Extracts review outputs (summary, findings, score) from text with review tags
 */
export function extractAutoPilotReviewOutputs(
  text: string,
): ExtractedType<typeof AUTOPILOT_REVIEW_SECTION> {
  return extractTaggedOutputs({
    text,
    outputsMapper: AUTOPILOT_REVIEW_SECTION,
  });
}

/**
 * Extracts autopilot step outputs including dynamic review sections
 */
export function extractAutoPilotStepOutputs(
  text: string,
  reviewTypes: AutoReviewSectionConfig[] = [],
): ExtractedType<typeof BASE_AUTOPILOT_STEP> &
  Record<string, string | undefined> {
  const reviewSections = reviewConfigsToOutputsMapping(reviewTypes);
  const outputsMapper = { ...BASE_AUTOPILOT_STEP, ...reviewSections };
  return extractTaggedOutputs({ text, outputsMapper }) as ExtractedType<
    typeof BASE_AUTOPILOT_STEP
  > &
    Record<string, string | undefined>;
}

export function extractPilotOutputs(text: string): {
  code: string;
  cacheValidationMatcher: string;
} {
  const outputs = extractTaggedOutputs({
    text,
    outputsMapper: PILOT_OUTPUTS,
  });

  const cacheValidationMatcher = outputs.cacheValidationMatcher
    ? outputs.cacheValidationMatcher.trim().replace(/\s*\/>/g, "")
    : "";

  return { code: outputs.code, cacheValidationMatcher: cacheValidationMatcher };
}
