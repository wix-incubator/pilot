import { UserGoalToPilotGoalPromptCreator } from "./UserGoalToPilotGoalPromptCreator";

describe("UserGoalToPilotGoalPromptCreator", () => {
  let promptCreator: UserGoalToPilotGoalPromptCreator;
  const sampleGoal = "Test that users can log in successfully";

  beforeEach(() => {
    promptCreator = new UserGoalToPilotGoalPromptCreator();
  });

  it("should create a prompt with the provided goal and correct sections", () => {
    const prompt = promptCreator.createPrompt(sampleGoal);

    // Check that the base prompt section is included
    expect(prompt).toContain("# General Goal to QA Test Goal Conversion");

    // Check that the context section includes the provided goal
    expect(prompt).toContain("## Context");
    expect(prompt).toContain("### Goal Provided");
    expect(prompt).toContain(sampleGoal);

    // Check that instructions and examples sections are included
    expect(prompt).toContain("## Instructions");
    expect(prompt).toContain("## Examples");

    // Check that the final instruction is appended
    expect(prompt).toContain("Please provide your response below:");

    // Snapshot test to catch any unintended changes
    expect(prompt).toMatchSnapshot();
  });
});
