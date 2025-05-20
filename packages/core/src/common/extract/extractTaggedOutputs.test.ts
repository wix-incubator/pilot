import {
  extractAutoPilotStepOutputs,
  extractAutoPilotReviewOutputs,
  extractPilotOutputs,
} from "./extractTaggedOutputs";
import { AutoReviewSectionConfig } from "@/types/auto";

const UX: AutoReviewSectionConfig = {
  title: "UX",
  description: "UX",
  guidelines: ["UX"],
};

const TEXT = `
        This is the description of the screen:
        <SCREENDESCRIPTION>
        This is the screen with a button
        </SCREENDESCRIPTION>
        These are my thoughts:
        <THOUGHTS>
        I think this is great
        </THOUGHTS>
        This is the action the pilot should perform:
         <ACTION>
         Tap on GREAT button
        </ACTION>
        <GOAL_SUMMARY>
        This is the summary of the review
        </GOAL_SUMMARY>`;

describe("extractOutputs", () => {
  describe("extractAutoPilotStepOutputs", () => {
    it("should extract outputs from text", () => {
      const outputs = extractAutoPilotStepOutputs(TEXT);
      {
        expect(outputs).toEqual({
          screenDescription: "This is the screen with a button",
          thoughts: "I think this is great",
          goalSummary: "This is the summary of the review",
          action: "Tap on GREAT button",
        });
      }
    });

    it("should extract outputs from text with multiple tags", () => {
      const textToBeParsed = `${TEXT}
        <ACTION>
         Tap on WOW button
        </ACTION>`;
      const outputs = extractAutoPilotStepOutputs(textToBeParsed);
      expect(outputs).toEqual({
        screenDescription: "This is the screen with a button",
        thoughts: "I think this is great",
        action: "Tap on GREAT button",
        goalSummary: "This is the summary of the review",
      });
    });

    it("should throw error if required output is missing", () => {
      const textToBeParsed = `
        These are my thoughts:
        <THOUGHTS>
        I think this is great
        </THOUGHTS>
        This is the action the pilot should perform:
         <ACTION>
         Tap on GREAT button
        </ACTION>`;
      expect(() => extractAutoPilotStepOutputs(textToBeParsed)).toThrowError(
        "Missing field for required tag <SCREENDESCRIPTION>",
      );
    });

    it("should extract from text including additional review types", () => {
      const textToBeParsed = `${TEXT}
        This is the ux review:
        <UX>
        <SUMMARY>
          This is the ux review summary
        </SUMMARY>
        <FINDINGS>
            These are the ux review findings
        </FINDINGS>
        <SCORE>
            100
        </SCORE>   
        </UX>`;
      const outputs = extractAutoPilotStepOutputs(textToBeParsed, [UX]);
      expect(outputs).toEqual({
        screenDescription: "This is the screen with a button",
        thoughts: "I think this is great",
        action: "Tap on GREAT button",
        goalSummary: "This is the summary of the review",
        UX: "<SUMMARY>\n          This is the ux review summary\n        </SUMMARY>\n        <FINDINGS>\n            These are the ux review findings\n        </FINDINGS>\n        <SCORE>\n            100\n        </SCORE>",
      });
    });

    it("should throw error if required output is missing for additional review types", () => {
      expect(() => extractAutoPilotStepOutputs(TEXT, [UX])).toThrowError(
        "Missing field for required tag <UX>",
      );
    });
  });

  describe("extractReviewOutputs", () => {
    it("should extract outputs from text", () => {
      const textToBeParsed = `
        This is the summary:
        <SUMMARY>
        This is the summary of the review
        </SUMMARY>
        These are the findings:
        <FINDINGS>
        These are the findings of the review
        </FINDINGS>
        This is the score:
        <SCORE>
        100
        </SCORE>`;
      const outputs = extractAutoPilotReviewOutputs(textToBeParsed);
      expect(outputs).toEqual({
        summary: "This is the summary of the review",
        findings: "These are the findings of the review",
        score: "100",
      });
    });

    it("should extract outputs from text with missing optional fields", () => {
      const textToBeParsed = `
        This is the summary:
        <SUMMARY>
        This is the summary of the review
        </SUMMARY>`;
      const outputs = extractAutoPilotReviewOutputs(textToBeParsed);
      expect(outputs).toEqual({
        summary: "This is the summary of the review",
        findings: undefined,
        score: undefined,
      });
    });
  });

  describe("extractPilotOutputs", () => {
    it("should extract outputs from text", () => {
      const textToBeParsed = `
         This is the cache validation matcher:
         <CACHE_VALIDATION_MATCHER>
         This is the cache validation matcher
         </CACHE_VALIDATION_MATCHER>
         This is the code:
         <CODE>
         This is the code
         </CODE>`;
      const outputs = extractPilotOutputs(textToBeParsed);
      expect(outputs).toEqual({
        cacheValidationMatcher: "This is the cache validation matcher",
        code: "This is the code",
      });
    });

    it("should throw error if required output is missing", () => {
      const textToBeParsedNoCode = `
            This is the cache validation matcher:
            <CACHE_VALIDATION_MATCHER>
            This is the cache validation matcher
            </CACHE_VALIDATION_MATCHER>`;
      expect(() => extractPilotOutputs(textToBeParsedNoCode)).toThrowError(
        "Missing field for required tag <CODE>",
      );

      const textToBeParsedNoViewHierarchy = `
            This is the code:
            <CODE>
            This is the code
            </CODE>`;
      expect(() =>
        extractPilotOutputs(textToBeParsedNoViewHierarchy),
      ).toThrowError(
        "Missing field for required tag <CACHE_VALIDATION_MATCHER>",
      );
    });
  });
});
