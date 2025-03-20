import {breakReviewArrayToOutputsMapping} from "@/performers/auto-performer/reviews/reviews-utils";
import {AutoReviewSectionType} from "@/types";

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

export const OUTPUTS_MAPPINGS: Record<string, OutputsMapping> = {
  PILOT_REVIEW_SECTION: {
    summary: { tag: "SUMMARY", isRequired: false },
    findings: { tag: "FINDINGS", isRequired: false },
    score: { tag: "SCORE", isRequired: false },
  },
  PILOT_STEP: {
    ...BASE_PILOT_STEP,
  },
  PILOT_SUMMARY: {
    summary: { tag: "SUMMARY", isRequired: true },
  },
};

export function extractTaggedOutputs<M extends OutputsMapping>({
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

export function extractTaggedOutputsController(text: string, reviewTypes?: AutoReviewSectionType[]): {[K in keyof ReturnType<typeof breakReviewArrayToOutputsMapping>]: string} {
    if (!reviewTypes){
        return extractTaggedOutputs({
            text,
            outputsMapper: OUTPUTS_MAPPINGS.PILOT_STEP,
        });
    }
    const review_sections = breakReviewArrayToOutputsMapping(reviewTypes);
    const pilot_step = {...BASE_PILOT_STEP, ...review_sections};
    return extractTaggedOutputs({
        text,
        outputsMapper: pilot_step,
    });
}
