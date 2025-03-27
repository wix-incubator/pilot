import { AutoPerformerPromptCreator } from "./AutoPerformerPromptCreator";
import { AutoPreviousStep } from "@/types";
import { AUTOPILOT_REVIEW_DEFAULTS } from "./reviews/reviewDefaults";

describe("PilotPromptCreator", () => {
  let promptCreator: AutoPerformerPromptCreator;
  const intent = "tap button";
  const viewHierarchy =
    '<View><Button testID="submit" title="Submit" /></View>';

  beforeEach(() => {
    promptCreator = new AutoPerformerPromptCreator();
  });

  describe("with review types", () => {
    it("should create a prompt for an intent correctly with additional review types", () => {
      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        true,
        [],
        AUTOPILOT_REVIEW_DEFAULTS,
      );
      expect(prompt).toMatchSnapshot();
    });

    it("should include previous intents in the context", () => {
      const previousSteps: AutoPreviousStep[] = [
        {
          screenDescription: "default 1",
          step: "navigate to login screen",
        },
        {
          screenDescription: "default 2",
          step: "enter username",
        },
      ];

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        previousSteps,
        AUTOPILOT_REVIEW_DEFAULTS,
      );

      expect(prompt).toMatchSnapshot();
    });

    it("should handle when no snapshot image is attached", () => {
      const intent = "expect button to be visible";

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        [],
        AUTOPILOT_REVIEW_DEFAULTS,
      );

      expect(prompt).toMatchSnapshot();
    });

    it("should contain error in the prompt if previous step failed", () => {
      const previousSteps: AutoPreviousStep[] = [
        {
          screenDescription: "default 1",
          step: "navigate to login screen",
        },
        {
          screenDescription: "default 2",
          step: "enter username",
          error: "Failed to enter username",
        },
      ];

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        previousSteps,
        AUTOPILOT_REVIEW_DEFAULTS,
      );

      expect(prompt).toContain("Failed to enter username");
      expect(prompt).toMatchSnapshot();
    });

    it("should not contain error in the prompt if it was not in the immediate previous step", () => {
      const previousSteps: AutoPreviousStep[] = [
        {
          screenDescription: "default 1",
          step: "navigate to login screen",
          error: new Error("Failed to navigate to login screen"),
        },
        {
          screenDescription: "default 2",
          step: "enter username",
        },
      ];

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        previousSteps,
        AUTOPILOT_REVIEW_DEFAULTS,
      );

      expect(prompt).not.toContain("Failed to navigate to login screen");
      expect(prompt).toMatchSnapshot();
    });
  });

  describe("without review types", () => {
    it("should create a prompt for an intent correctly without additional review types", () => {
      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        true,
        [],
      );
      expect(prompt).toMatchSnapshot();
    });

    it("should include previous intents in the context", () => {
      const previousSteps: AutoPreviousStep[] = [
        {
          screenDescription: "default 1",
          step: "navigate to login screen",
        },
        {
          screenDescription: "default 2",
          step: "enter username",
        },
      ];

      const prompt = promptCreator.createPrompt(
        intent,
        viewHierarchy,
        false,
        previousSteps,
      );

      expect(prompt).toMatchSnapshot();
    });
  });
});
