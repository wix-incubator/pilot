export function extractCodeBlock(text: string): string {
  // Check for triple backtick code blocks
  const tripleBacktickRegex = /```(?:\w+)?\r?\n([\s\S]*?)\r?\n```/;
  const tripleBacktickMatch = text.match(tripleBacktickRegex);

  // Check for single backtick code blocks (including empty ones)
  const singleBacktickRegex = /^[ \t]*`([^`]*)`[ \t]*$/m;
  const singleBacktickMatch = text.match(singleBacktickRegex);

  if (tripleBacktickMatch) {
    // Get content from triple backtick block
    const innerContent = tripleBacktickMatch[1].trim();
    // Recursively check for nested code blocks
    const nestedResult = extractCodeBlock(innerContent);
    // If we found a nested code block, return it
    if (nestedResult !== innerContent) {
      return nestedResult;
    }
    // Otherwise return the inner content
    return innerContent;
  } else if (singleBacktickMatch) {
    // Return content from single backtick block
    return singleBacktickMatch[1];
  }

  // If no code block is found, return the original text
  return text;
}
