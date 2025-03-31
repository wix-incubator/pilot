import { LoggerMessageComponent } from "@/types/logger";

/**
 * Parses text with markdown-like formatting and converts it to logger message components:
 * - Regular text will be displayed in gray (default color)
 * - *Text between single asterisks* will be displayed in white
 * - **Text between double asterisks** will be displayed bold in gray
 * - ***Text between triple asterisks*** will be displayed bold in white
 *
 * @param text The text with formatting to parse
 * @returns An array of LoggerMessageComponents with correct formatting
 */
export function parseFormattedText(text: string): LoggerMessageComponent[] {
  if (!text) return [];

  // Split the text into segments based on the formatting markers
  const components: LoggerMessageComponent[] = [];

  // Regular expression to match the formatted text patterns
  // (\*{3}([^*]+)\*{3}) - matches ***bold white text***
  // (\*{2}([^*]+)\*{2}) - matches **bold text**
  // (\*([^*]+)\*) - matches *white text*
  // ([^*]+) - matches regular text
  const regex =
    /(\*{3}([^*]+)\*{3})|(\*{2}([^*]+)\*{2})|(\*([^*]+)\*)|([^*]+)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Triple asterisks: bold white text
      components.push({
        message: match[2],
        isBold: true,
        color: "whiteBright",
      });
    } else if (match[4]) {
      // Double asterisks: bold gray text
      components.push({
        message: match[4],
        isBold: true,
        color: "gray",
      });
    } else if (match[6]) {
      // Single asterisks: white text
      components.push({
        message: match[6],
        isBold: false,
        color: "whiteBright",
      });
    } else if (match[7]) {
      // Regular text: gray text
      components.push({
        message: match[7],
        isBold: false,
        color: "gray",
      });
    }
  }

  return components;
}
