import {
  extractAutoPilotStepOutputs,
  extractAutoPilotReviewOutputs,
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
        <SUMMARY>
        This is the summary of the review
        </SUMMARY>`;

describe("extractOutputs", () => {
  describe("extractAutoPilotStepOutputs", () => {
    it("should extract outputs from text", () => {
      const outputs = extractAutoPilotStepOutputs(TEXT);
      {
        expect(outputs).toEqual({
          screenDescription: "This is the screen with a button",
          thoughts: "I think this is great",
          summary: "This is the summary of the review",
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
        summary: "This is the summary of the review",
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
        This is the yx review:
        <UX>
        This is the UX review
        </UX>`;
      const outputs = extractAutoPilotStepOutputs(textToBeParsed, [UX]);
      expect(outputs).toEqual({
        screenDescription: "This is the screen with a button",
        thoughts: "I think this is great",
        action: "Tap on GREAT button",
        summary: "This is the summary of the review",
        UX: "This is the UX review",
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
        findings: "N/A",
        score: "N/A",
      });
    });
  });
});
