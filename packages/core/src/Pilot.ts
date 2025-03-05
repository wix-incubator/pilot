import {
  Config,
  PreviousStep,
  ScreenCapturerResult,
  TestingFrameworkAPICatalogCategory,
} from "@/types";
import { PilotError } from "@/errors/PilotError";
import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import { CacheHandler } from "@/common/cacheHandler/CacheHandler";
import { AutoPerformer } from "@/performers/auto-performer/AutoPerformer";
import { AutoPerformerPromptCreator } from "@/performers/auto-performer/AutoPerformerPromptCreator";
import { AutoReport } from "@/types/auto";
import { StepPerformerPromptCreator } from "@/performers/step-performer/StepPerformerPromptCreator";
import { CodeEvaluator } from "@/common/CodeEvaluator";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";
import { SnapshotManager } from "@/common/snapshot/SnapshotManager";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import downscaleImage from "@/common/snapshot/downscaleImage";

/**
 * The main Pilot class that provides AI-assisted testing capabilities for a given underlying testing framework.
 * Enables writing tests in natural language that are translated into precise testing actions.
 *
 * Usage:
 * ```typescript
 * const pilot = new Pilot({
 *   frameworkDriver: new PuppeteerFrameworkDriver(),
 *   promptHandler: new OpenAIHandler({ apiKey: process.env.OPENAI_API_KEY })
 * });
 *
 * pilot.start();
 * await pilot.perform('Navigate to the login page');
 * await pilot.perform('Enter "user@example.com" in the email field');
 * pilot.end();
 * ```
 */
export class Pilot {
  private readonly snapshotManager: SnapshotManager;
  private previousSteps: PreviousStep[] = [];
  private stepPerformerPromptCreator: StepPerformerPromptCreator;
  private stepPerformer: StepPerformer;
  private cacheHandler: CacheHandler;
  private running: boolean = false;
  private autoPerformer: AutoPerformer;
  private screenCapturer: ScreenCapturer;
  private snapshotComparator: SnapshotComparator;

  constructor(config: Config) {
    this.snapshotComparator = new SnapshotComparator();

    this.snapshotManager = new SnapshotManager(
      config.frameworkDriver,
      this.snapshotComparator,
      downscaleImage,
    );

    this.cacheHandler = new CacheHandler(config.options?.cacheOptions);
    this.stepPerformerPromptCreator = new StepPerformerPromptCreator(
      config.frameworkDriver.apiCatalog,
    );

    this.screenCapturer = new ScreenCapturer(
      this.snapshotManager,
      config.promptHandler,
    );

    this.stepPerformer = new StepPerformer(
      config.frameworkDriver.apiCatalog.context,
      this.stepPerformerPromptCreator,
      new CodeEvaluator(),
      config.promptHandler,
      this.cacheHandler,
      new SnapshotComparator(),
      this.screenCapturer,
    );

    this.screenCapturer = new ScreenCapturer(
      this.snapshotManager,
      config.promptHandler,
    );

    this.snapshotComparator = new SnapshotComparator();

    this.autoPerformer = new AutoPerformer(
      new AutoPerformerPromptCreator(),
      this.stepPerformer,
      config.promptHandler,
      this.screenCapturer,
      this.cacheHandler,
      this.snapshotComparator,
    );
  }

  /**
   * Checks if Pilot is currently running a test flow.
   * @returns true if running, false otherwise
   */
  private assertIsRunning() {
    if (!this.running) {
      throw new PilotError(
        "Pilot is not running. Please call the `start()` method before performing a test step.",
      );
    }
  }

  /**
   * Starts a new test flow session.
   * Must be called before any test operations to ensure a clean state, as Pilot uses operation history for context.
   */
  public start(): void {
    if (this.running) {
      throw new PilotError(
        "Pilot was already started. Please call the `end()` method before starting a new test flow.",
      );
    }

    this.running = true;
    this.previousSteps = [];
    this.cacheHandler.clearTemporaryCache();
  }

  /**
   * Ends the current test flow session and handles cache management.
   * @param shouldSaveInCache - If true, the current test flow will be saved in cache (default: true)
   */
  public end(shouldSaveInCache = true): void {
    if (!this.running) {
      throw new PilotError(
        "Pilot is not running. Please call the `start()` method before ending the test flow.",
      );
    }

    this.running = false;

    if (shouldSaveInCache) this.cacheHandler.flushTemporaryCache();
  }

  /**
   * Extends the testing framework's API capabilities.
   * @param categories - Additional API categories to add
   * @param context - Testing framework variables to expose (optional)
   * @example
   * pilot.extendAPICatalog([
   *   {
   *     title: 'Custom Actions',
   *     items: [
   *       {
   *         signature: 'customAction(param: string)',
   *         description: 'Performs a custom action',
   *         example: 'await customAction("param")',
   *         guidelines: ['Use this action for specific test scenarios']
   *       }
   *     ]
   *   }
   * ], { customAction });
   */
  extendAPICatalog(
    categories: TestingFrameworkAPICatalogCategory[],
    context?: any,
  ): void {
    this.stepPerformerPromptCreator.extendAPICategories(categories);
    if (context) this.stepPerformer.extendJSContext(context);
  }

  /**
   * Performs one or more test steps using the provided intents.
   * @param steps The intents describing the test steps to perform.
   * @returns The result of the last executed step.
   */
  async perform(...steps: string[]): Promise<any> {
    let result;
    for await (const step of steps) {
      result = await this.performStep(step);
    }
    return result;
  }

  private async performStep(step: string): Promise<any> {
    this.assertIsRunning();

    const screenCapture: ScreenCapturerResult =
      await this.screenCapturer.capture(true);

    const { code, result } = await this.stepPerformer.perform(
      step,
      this.previousSteps,
      screenCapture,
    );

    this.didPerformStep(step, code, result);
    return result;
  }

  private didPerformStep(step: string, code: string, result: any): void {
    this.previousSteps = [
      ...this.previousSteps,
      {
        step,
        code,
        result,
      },
    ];
  }

  /**
   * Performs an entire test flow using the provided goal.
   * @param goal A string which describes the flow should be executed.
   * @returns pilot report with info about the actions thoughts etc ...
   */
  async autopilot(goal: string): Promise<AutoReport> {
    this.assertIsRunning();
    return await this.autoPerformer.perform(goal);
  }
}
