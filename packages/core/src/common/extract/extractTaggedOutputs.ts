import { reviewConfigsToOutputsMapping } from "@/performers/auto-performer/reviews/reviews-utils";
import { AutoReviewSectionConfig } from "@/types";

export type Output = {
  tag: string;
  isRequired: boolean;
};

export type OutputsMapping = Record<string, Output>;

const BASE_PILOT_STEP = {
  screenDescription: { tag: "SCREENDESCRIPTION", isRequired: true },
  thoughts: { tag: "THOUGHTS", isRequired: true },
  action: { tag: "ACTION", isRequired: true },
};

const PILOT_REVIEW_SECTION = {
  summary: { tag: "SUMMARY", isRequired: false },
  findings: { tag: "FINDINGS", isRequired: false },
  score: { tag: "SCORE", isRequired: false },
};

const PILOT_SUMMARY = {
  summary: { tag: "SUMMARY", isRequired: true },
};

function extractTaggedOutputs<M extends OutputsMapping>({
  text,
  outputsMapper,
}: {
  text: string;
  outputsMapper: M;
}): { [K in keyof M]: string } {
  const outputs: Partial<{ [K in keyof M]: string }> = {};

  for (const fieldName in outputsMapper) {
    const tag = outputsMapper[fieldName].tag;
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
    const match = text.match(regex);
    if (match) {
      outputs[fieldName] = match[1].trim();
    } else if (!outputsMapper[fieldName].isRequired) {
      outputs[fieldName] = "N/A";
    } else {
      throw new Error(`Missing field for required tag <${tag}>`);
    }
  }

  return outputs as { [K in keyof M]: string };
}

export function extractPilotSummaryOutputs(text: string): {
  [K in keyof typeof PILOT_SUMMARY]: string;
} {
  return extractTaggedOutputs({ text, outputsMapper: PILOT_SUMMARY });
}

export function extractReviewOutputs(text: string): {
  [K in keyof typeof PILOT_REVIEW_SECTION]: string;
} {
  return extractTaggedOutputs({ text, outputsMapper: PILOT_REVIEW_SECTION });
}

export function extractAutoPilotStepOutputs(
  text: string,
  reviewTypes: AutoReviewSectionConfig[] = [],
): {
  [K in keyof ReturnType<typeof reviewConfigsToOutputsMapping>]: string;
} {
  const reviewSections = reviewConfigsToOutputsMapping(reviewTypes);
  const outputsMapper = { ...BASE_PILOT_STEP, ...reviewSections };
  return extractTaggedOutputs({ text, outputsMapper });
}
