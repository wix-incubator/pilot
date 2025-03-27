import { AutoReviewSectionConfig } from "@/types";
import { OutputsMapping } from "@/common/extract/extractTaggedOutputs";

export function reviewConfigsToOutputsMapping(
  reviews: AutoReviewSectionConfig[],
): OutputsMapping {
  return reviews.reduce((pilotStep, review) => {
    const { title } = review;
    return {
      ...pilotStep,
      [title]: { tag: title.toUpperCase(), isRequired: true },
    };
  }, {});
}

export function breakReviewArrayToItsTypes(
  reviews: AutoReviewSectionConfig[],
): string[] {
  return reviews.map((review) => review.title);
}
