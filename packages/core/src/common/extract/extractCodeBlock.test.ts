import { extractCodeBlock } from "./extractCodeBlock";

describe("extractCodeBlock", () => {
  const runExtractionTest = (
    input: string,
    expected: { code: string; viewHierarchy: any[] },
  ) => {
    const result = extractCodeBlock(input);
    expect(result).toEqual(expected);
  };

  describe("triple backtick code blocks", () => {
    const sampleCode = "const a = 1;\nconst b = 2;\nreturn a + b;";
    const sampleCodeReturnObject = {
      code: "const a = 1;\nconst b = 2;\nreturn a + b;",
      viewHierarchy: [],
    };

    it("should extract code block with language specified", () =>
      runExtractionTest(
        "```js\n" + sampleCode + "\n```",
        sampleCodeReturnObject,
      ));

    it("should extract code block without language specified", () =>
      runExtractionTest(
        "```\n" + sampleCode + "\n```",
        sampleCodeReturnObject,
      ));

    it("should extract code block with different language specified", () =>
      runExtractionTest(
        "```python\n" + sampleCode + "\n```",
        sampleCodeReturnObject,
      ));

    it("should trim code blocks from whitespace", () =>
      runExtractionTest(
        "```\n  \n" + sampleCode + "  \n```",
        sampleCodeReturnObject,
      ));
  });

  describe("single backtick code blocks", () => {
    it("should extract inline code", () =>
      runExtractionTest("`const a = 1;`", {
        code: "const a = 1;",
        viewHierarchy: [],
      }));

    it("should not extract multi-line inline code", () =>
      runExtractionTest("`const a = 1;\nconst b = 2;` text after", {
        code: "`const a = 1;\nconst b = 2;` text after",
        viewHierarchy: [],
      }));

    it("should handle empty inline code blocks", () =>
      runExtractionTest("``", { code: "", viewHierarchy: [] }));
  });

  describe("nested code blocks", () => {
    it("should extract code block nested within text", () =>
      runExtractionTest(
        "Some text before\n```js\nconst code = true;\n```\nSome text after",
        { code: "const code = true;", viewHierarchy: [] },
      ));

    it("should extract inline code nested within text", () =>
      runExtractionTest(
        "Some text before\n`const code = true;`\nSome text after",
        { code: "const code = true;", viewHierarchy: [] },
      ));

    it("should extract nested single-backtick code from triple-backtick block", () =>
      runExtractionTest(
        "```\nsome text before\n`const b = 2;`\nsome text after\n```",
        { code: "const b = 2;", viewHierarchy: [] },
      ));

    it("should not extract code blocks without proper line-breaks", () =>
      runExtractionTest("```const a = 1;```", {
        code: "```const a = 1;```",
        viewHierarchy: [],
      }));

    it("should handle multiple nested triple-backticks code blocks and extract the first one", () =>
      runExtractionTest(
        "Text\n```\nconst a = 1;\n```\nmore text\n```\nconst b = 2;\n```\nend",
        { code: "const a = 1;", viewHierarchy: [] },
      ));

    it("should handle multiple nested single-backticks code blocks and return the original text", () =>
      runExtractionTest("Text `const a = 1;` more text `const b = 2;` end", {
        code: "Text `const a = 1;` more text `const b = 2;` end",
        viewHierarchy: [],
      }));

    it("should handle multiple nested code blocks and prefer the triple-backtick one (1)", () =>
      runExtractionTest(
        "Text\n```\nconst a = 1;\n```\nmore text `const b = 2;` end",
        { code: "const a = 1;", viewHierarchy: [] },
      ));

    it("should handle multiple nested code blocks and prefer the triple-backtick one (2)", () =>
      runExtractionTest(
        "Text `const a = 1;` more text\n```\nconst b = 2;\n```\nend",
        { code: "const b = 2;", viewHierarchy: [] },
      ));
  });

  describe("edge cases", () => {
    it("should return original text if no code block is found", () =>
      runExtractionTest("This is some text", {
        code: "This is some text",
        viewHierarchy: [],
      }));

    it("should handle text with backticks that are not code blocks", () =>
      runExtractionTest("Text with ` random backticks ` in middle", {
        code: "Text with ` random backticks ` in middle",
        viewHierarchy: [],
      }));

    it("should handle mixed backtick styles without proper closure", () =>
      runExtractionTest("Text ```with unclosed block", {
        code: "Text ```with unclosed block",
        viewHierarchy: [],
      }));

    it("should handle text with multiple backticks that are not code blocks", () =>
      runExtractionTest("Text ``` with ``` multiple ``` backticks", {
        code: "Text ``` with ``` multiple ``` backticks",
        viewHierarchy: [],
      }));
  });

  describe("view hierarchy", () => {
    it("should extract view hierarchy", () => {
      const textToBeParsed =
        'View hierarchy snippet showing relevant context: ```<RCTUITextField alpha="1.0" class="RCTUITextField" focused="false" height="33" id="detox_temp_0_0_0_0_0_0_0_0_0_0_0_0_0_5_0" value="Enter text" visibility="visible" width="277" x="1" y="1">``` const a = 1;\nconst b = 2;\nreturn a + b\n';
      const outputs = extractCodeBlock(textToBeParsed);
      expect(outputs).toEqual({
        viewHierarchy: [
          '<RCTUITextField alpha="1.0" class="RCTUITextField" focused="false" height="33" id="detox_temp_0_0_0_0_0_0_0_0_0_0_0_0_0_5_0" value="Enter text" visibility="visible" width="277" x="1" y="1">',
        ],
        code: "const a = 1;\nconst b = 2;\nreturn a + b",
      });
    });
  });
});
