import { extractCodeBlock } from "./extractCodeBlock";

describe("extractCodeBlock", () => {
  const runExtractionTest = (input: string, expected: string) => {
    const result = extractCodeBlock(input);
    expect(result).toBe(expected);
  };

  describe("triple backtick code blocks", () => {
    const sampleCode = "const a = 1;\nconst b = 2;\nreturn a + b;";

    it("should extract code block with language specified", () =>
      runExtractionTest("```js\n" + sampleCode + "\n```", sampleCode));

    it("should extract code block without language specified", () =>
      runExtractionTest("```\n" + sampleCode + "\n```", sampleCode));

    it("should extract code block with different language specified", () =>
      runExtractionTest("```python\n" + sampleCode + "\n```", sampleCode));

    it("should trim code blocks from whitespace", () =>
      runExtractionTest("```\n  \n" + sampleCode + "  \n```", sampleCode));
  });

  describe("single backtick code blocks", () => {
    it("should extract inline code", () =>
      runExtractionTest("`const a = 1;`", "const a = 1;"));

    it("should not extract multi-line inline code", () =>
      runExtractionTest(
        "`const a = 1;\nconst b = 2;` text after",
        "`const a = 1;\nconst b = 2;` text after",
      ));

    it("should handle empty inline code blocks", () =>
      runExtractionTest("``", ""));
  });

  describe("nested code blocks", () => {
    it("should extract code block nested within text", () =>
      runExtractionTest(
        "Some text before\n```js\nconst code = true;\n```\nSome text after",
        "const code = true;",
      ));

    it("should extract inline code nested within text", () =>
      runExtractionTest(
        "Some text before\n`const code = true;`\nSome text after",
        "const code = true;",
      ));

    it("should extract nested single-backtick code from triple-backtick block", () =>
      runExtractionTest(
        "```\nsome text before\n`const b = 2;`\nsome text after\n```",
        "const b = 2;",
      ));

    it("should not extract code blocks without proper line-breaks", () =>
      runExtractionTest("```const a = 1;```", "```const a = 1;```"));

    it("should handle multiple nested triple-backticks code blocks and extract the first one", () =>
      runExtractionTest(
        "Text\n```\nconst a = 1;\n```\nmore text\n```\nconst b = 2;\n```\nend",
        "const a = 1;",
      ));

    it("should handle multiple nested single-backticks code blocks and return the original text", () =>
      runExtractionTest(
        "Text `const a = 1;` more text `const b = 2;` end",
        "Text `const a = 1;` more text `const b = 2;` end",
      ));

    it("should handle multiple nested code blocks and prefer the triple-backtick one (1)", () =>
      runExtractionTest(
        "Text\n```\nconst a = 1;\n```\nmore text `const b = 2;` end",
        "const a = 1;",
      ));

    it("should handle multiple nested code blocks and prefer the triple-backtick one (2)", () =>
      runExtractionTest(
        "Text `const a = 1;` more text\n```\nconst b = 2;\n```\nend",
        "const b = 2;",
      ));
  });

  describe("edge cases", () => {
    it("should return original text if no code block is found", () =>
      runExtractionTest("This is some text", "This is some text"));

    it("should handle text with backticks that are not code blocks", () =>
      runExtractionTest(
        "Text with ` random backticks ` in middle",
        "Text with ` random backticks ` in middle",
      ));

    it("should handle mixed backtick styles without proper closure", () =>
      runExtractionTest(
        "Text ```with unclosed block",
        "Text ```with unclosed block",
      ));

    it("should handle text with multiple backticks that are not code blocks", () =>
      runExtractionTest(
        "Text ``` with ``` multiple ``` backticks",
        "Text ``` with ``` multiple ``` backticks",
      ));
  });
});
