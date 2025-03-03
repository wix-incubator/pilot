import { AutoPerformerPromptCreator } from "./AutoPerformerPromptCreator";
import { AutoPreviousStep } from "@/types";

describe("PilotPromptCreator", () => {
  let promptCreator: AutoPerformerPromptCreator;
  const intent = "tap button";

  beforeEach(() => {
    promptCreator = new AutoPerformerPromptCreator();
  });

  it("should create a prompt for an intent correctly", () => {
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';
    const prompt = promptCreator.createPrompt(intent, viewHierarchy, true, []);
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

    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(
      intent,
      viewHierarchy,
      false,
      previousSteps,
    );

    expect(prompt).toMatchSnapshot();
  });

  it("should handle when no snapshot image is attached", () => {
    const intent = "expect button to be visible";
    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(intent, viewHierarchy, false, []);

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
        error: new Error("Failed to enter username"),
      },
    ];

    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(
      intent,
      viewHierarchy,
      false,
      previousSteps,
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

    const viewHierarchy =
      '<View><Button testID="submit" title="Submit" /></View>';

    const prompt = promptCreator.createPrompt(
      intent,
      viewHierarchy,
      false,
      previousSteps,
    );

    expect(prompt).toMatchSnapshot();
    expect(prompt).not.toContain("Failed to navigate to login screen");
  });
});
