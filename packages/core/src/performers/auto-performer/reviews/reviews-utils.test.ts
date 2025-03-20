import { AUTOPILOT_REVIEW_DEFAULTS } from "./reviewDefaults";
import { OutputsMapping } from "@/common/extract/extractTaggedOutputs";
import {
  breakReviewArrayToOutputsMapping,
  breakReviewArrayToItsTypes,
} from "./reviews-utils";

const AUTOPILOT_REVIEW = [
  {
    title: "Performance Testing",
    emoji: "🚀",
    description:
      "The Performance Testing Review focuses on the speed and responsiveness of the product. This review assesses the loading times, animations, and transitions of the UI components.",
    guidelines: [
      "Check the loading times of different screens or sections.",
      "Verify that animations and transitions are smooth and responsive",
      "Assess the overall performance on different devices and network conditions.",
    ],
  },
];

describe("Reviews Utils", () => {
  describe("breakReviewArrayToOutputsMapping", () => {
    it("should return the correct OutputsMapping with default", () => {
      const expected: OutputsMapping = {
        UX: { tag: "UX", isRequired: true },
        Accessibility: { tag: "ACCESSIBILITY", isRequired: true },
        Internationalization: { tag: "INTERNATIONALIZATION", isRequired: true },
      };
      const result = breakReviewArrayToOutputsMapping(
        AUTOPILOT_REVIEW_DEFAULTS,
      );
      expect(result).toEqual(expected);
    });

    it("should return the correct OutputsMapping with two-words review type", () => {
      const expected: OutputsMapping = {
        ["Performance Testing"]: {
          tag: "PERFORMANCE TESTING",
          isRequired: true,
        },
      };
      const result = breakReviewArrayToOutputsMapping(AUTOPILOT_REVIEW);
      expect(result).toEqual(expected);
    });
  });

  describe("breakReviewArrayToItsTypes", () => {
    it("should return the correct review types", () => {
      const expected = ["UX", "Accessibility", "Internationalization"];
      const result = breakReviewArrayToItsTypes(AUTOPILOT_REVIEW_DEFAULTS);
      expect(result).toEqual(expected);
    });

    it("should return the correct review types with two-words review type", () => {
      const expected = ["Performance Testing"];
      const result = breakReviewArrayToItsTypes(AUTOPILOT_REVIEW);
      expect(result).toEqual(expected);
    });
  });
});
