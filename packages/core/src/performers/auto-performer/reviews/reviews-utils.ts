import {AutoReviewSectionType} from "@/types";
import { OutputsMapping } from "@/common/extract/extractTaggedOutputs";

export function breakReviewArrayToOutputsMapping(
  reviews: AutoReviewSectionType[]
): OutputsMapping {
    return reviews.reduce((pilotStep, review) => {
        const { title } = review;
        return {
            ...pilotStep,
            [title]: { tag: title.toUpperCase(), isRequired: true }
        };
    }, {});
}

export function breakReviewArrayToItsTypes(
  reviews: AutoReviewSectionType[]
): string[] {
    return reviews.map(review => review.title);
}
