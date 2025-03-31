import { CodeEvaluationError } from "@/errors/CodeEvaluationError";
import { CodeEvaluationResult } from "@/types";
import logger from "@/common/logger";

export class CodeEvaluator {
  async evaluate(
    code: string,
    context: any,
    sharedContext: Record<string, any> = {},
  ): Promise<CodeEvaluationResult> {
    const asyncFunction = this.createAsyncFunction(
      code,
      context,
      sharedContext,
    );

    try {
      const result = await asyncFunction();

      logger.labeled("EVAL").info("Code executed successfully");

      logger.info({
        message: `${code}`,
        isBold: false,
        color: "gray",
      });

      return { code, result, sharedContext };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      
      logger.labeled("ERROR").error(`Execution failed: ${errorMessage}`);

      throw error;
    }
  }

  private createAsyncFunction(
    code: string,
    context: any,
    sharedContext: Record<string, any>,
  ): () => Promise<any> {
    try {
      const contextValues = Object.values(context);

      // Wrap the code in an immediately-invoked async function expression (IIFE), and inject context variables into the function
      return new Function(
        ...Object.keys(context),
        "sharedContext",
        `return (async () => { 
              ${code}
            })();`,
      ).bind(null, ...contextValues, sharedContext);
    } catch (error) {
      const underlyingErrorMessage = (error as Error)?.message;
      throw new CodeEvaluationError(
        `Failed to execute test step code, error: ${underlyingErrorMessage}:\n\`\`\`\n${code}\n\`\`\``,
      );
    }
  }
}
