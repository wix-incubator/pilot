import { extractTaggedOutputs } from "./extractTaggedOutputs";
import { OutputsMapping } from "./extractTaggedOutputs";

describe("extractOutputs", () => {
  it("should extract outputs from text", () => {
    const textToBeParsed = `
        These are my thoughts:
        <THOUGHTS>
        I think this is great
        </THOUGHTS>
        This is the action the pilot should perform:
         <ACTION>
         Tap on GREAT button
        </ACTION>`;
    const outputsMapper: OutputsMapping = {
      thoughts: { tag: "THOUGHTS", isRequired: true },
      action: { tag: "ACTION", isRequired: true },
    };
    const outputs = extractTaggedOutputs({
      text: textToBeParsed,
      outputsMapper,
    });
    expect(outputs).toEqual({
      thoughts: "I think this is great",
      action: "Tap on GREAT button",
    });
  });

  it("should extract outputs from text with multiple tags", () => {
    const textToBeParsed = `
        These are my thoughts:
        <THOUGHTS>
        I think this is great
        </THOUGHTS>
        This is the action the pilot should perform:
         <ACTION>
         Tap on GREAT button
        </ACTION>
        <ACTION>
         Tap on WOW button
        </ACTION>`;
    const outputsMapper: OutputsMapping = {
      thoughts: { tag: "THOUGHTS", isRequired: true },
      action: { tag: "ACTION", isRequired: true },
    };
    const outputs = extractTaggedOutputs({
      text: textToBeParsed,
      outputsMapper,
    });
    expect(outputs).toEqual({
      thoughts: "I think this is great",
      action: "Tap on GREAT button",
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
    const outputsMapper: OutputsMapping = {
      thoughts: { tag: "THOUGHTS", isRequired: true },
      action: { tag: "ACTION", isRequired: true },
      action2: { tag: "ACTION2", isRequired: true },
    };
    expect(() =>
      extractTaggedOutputs({ text: textToBeParsed, outputsMapper }),
    ).toThrowError("Missing field for required tag <ACTION2>");
  });

  it("should not throw error if required output is missing but not required", () => {
    const textToBeParsed = `
        These are my thoughts:
        <THOUGHTS>
        I think this is great
        </THOUGHTS>
        This is the action the pilot should perform:
         <ACTION>
         Tap on GREAT button
        </ACTION>`;
    const outputsMapper: OutputsMapping = {
      thoughts: { tag: "THOUGHTS", isRequired: true },
      action: { tag: "ACTION", isRequired: true },
      action2: { tag: "ACTION2", isRequired: false },
    };
    const outputs = extractTaggedOutputs({
      text: textToBeParsed,
      outputsMapper,
    });
    expect(outputs).toEqual({
      thoughts: "I think this is great",
      action: "Tap on GREAT button",
      action2: "N/A",
    });
  });
});
