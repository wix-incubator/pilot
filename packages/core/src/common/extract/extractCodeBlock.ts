export function extractCodeBlock(text: string): any {
  let viewHierarchyResult: string[] = [];
  let codeBlockResult = text;

  const viewHierarchyRegex =
    /View hierarchy snippet showing relevant context:\s*```(?:xml)?\s*([\s\S]*?)\s*```/;
  const viewHierarchyMatch = text.match(viewHierarchyRegex);

  if (viewHierarchyMatch) {
    viewHierarchyResult = viewHierarchyMatch[1]
      .trim()
      .split(/\n+/)
      .map((str) => str.trim())
      .filter((str) => str.length > 0)
      .map((str) => str.replace(/\s*\/>/g, ""));
    codeBlockResult = codeBlockResult.replace(viewHierarchyMatch[0], "").trim();
  }
  // Check for triple backtick code blocks
  const tripleBacktickRegex = /```(?:\w+)?\r?\n([\s\S]*?)\r?\n```/;
  const tripleBacktickMatch = codeBlockResult.match(tripleBacktickRegex);

  // Check for single backtick code blocks (including empty ones)
  const singleBacktickRegex = /^[ \t]*`([^`]*)`[ \t]*$/m;
  const singleBacktickMatch = codeBlockResult.match(singleBacktickRegex);

  let extractedCode: string;

  if (tripleBacktickMatch) {
    const innerContent = tripleBacktickMatch[1].trim();
    const nestedResult = extractCodeBlock(innerContent);
    extractedCode =
      typeof nestedResult === "object" ? nestedResult.code : nestedResult;
  } else if (singleBacktickMatch) {
    extractedCode = singleBacktickMatch[1];
  } else {
    extractedCode = codeBlockResult;
  }

  return { code: extractedCode, viewHierarchy: viewHierarchyResult };
}
