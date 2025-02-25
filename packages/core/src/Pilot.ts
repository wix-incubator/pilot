import {
  Config,
  PreviousStep,
  ScreenCapturerResult,
  TestingFrameworkAPICatalogCategory,
} from "@/types";
import { PilotError } from "@/errors/PilotError";
import { StepPerformer } from "@/performers/step-performer/StepPerformer";
import { StepPerformerCacheHandler } from "@/performers/step-performer/StepPerformerCacheHandler";
import { AutoPerformer } from "@/performers/auto-performer/AutoPerformer";
import { AutoPerformerPromptCreator } from "@/performers/auto-performer/AutoPerformerPromptCreator";
import { AutoReport } from "@/types/auto";
import { StepPerformerPromptCreator } from "@/performers/step-performer/StepPerformerPromptCreator";
import { APISearchPromptCreator } from "@/common/prompts/APISearchPromptCreator";
import { ViewAnalysisPromptCreator } from "@/common/prompts/ViewAnalysisPromptCreator";
import { CodeEvaluator } from "@/common/CodeEvaluator";
import { SnapshotComparator } from "@/common/snapshot/comparator/SnapshotComparator";
import { SnapshotManager } from "@/common/snapshot/SnapshotManager";
import { ScreenCapturer } from "@/common/snapshot/ScreenCapturer";
import downscaleImage from "@/common/snapshot/downscaleImage";

/**
 * The main Pilot class that provides AI-assisted testing capabilities for a given underlying testing framework.
 * @note Originally, this class is designed to work with Detox, but it can be extended to work with other frameworks.
 */
export class Pilot {
  // Singleton instance of Pilot
  static instance?: Pilot;

  private readonly snapshotManager: SnapshotManager;
  private previousSteps: PreviousStep[] = [];
  private stepPerformerPromptCreator: StepPerformerPromptCreator;
  private stepPerformer: StepPerformer;
  private cacheHandler: StepPerformerCacheHandler;
  private running: boolean = false;
  private autoPerformer: AutoPerformer;
  private screenCapturer: ScreenCapturer;

  private constructor(config: Config) {
    this.snapshotManager = new SnapshotManager(
      config.frameworkDriver,
      new SnapshotComparator(),
      downscaleImage,
    );

    this.cacheHandler = new StepPerformerCacheHandler();
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
      new APISearchPromptCreator(config.frameworkDriver.apiCatalog),
      new ViewAnalysisPromptCreator(config.frameworkDriver.apiCatalog),
      new CodeEvaluator(),
      config.promptHandler,
      this.cacheHandler,
      new SnapshotComparator(),
      this.screenCapturer,
      config.options?.cacheMode,
      config.options?.analysisMode,
    );

    this.autoPerformer = new AutoPerformer(
      new AutoPerformerPromptCreator(),
      this.stepPerformer,
      config.promptHandler,
      this.screenCapturer,
    );
  }

  /**
   * Gets the singleton instance of Pilot.
   * @returns The Pilot instance.
   */
  public static getInstance(): Pilot {
    if (!Pilot.instance) {
      throw new PilotError(
        "Pilot has not been initialized. Please call the `init()` method before using it.",
      );
    }

    return Pilot.instance;
  }

  /**
   * Initializes Pilot with the provided configuration.
   * Must be called before using any other methods.
   * @param config The configuration options for Pilot.
   * @throws Error if called multiple times
   */
  public static init(config: Config): void {
    if (Pilot.instance) {
      throw new PilotError(
        "Pilot has already been initialized. Please call the `init()` method only once.",
      );
    }

    Pilot.instance = new Pilot(config);
  }

  /**
   * Checks if Pilot has been properly initialized.
   * @returns true if initialized, false otherwise
   */
  public static isInitialized(): boolean {
    return !!Pilot.instance;
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
   * Starts Pilot by clearing the previous steps and temporary cache.
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
   * Ends the Pilot test flow and optionally saves the temporary cache to the main cache.
   * @param isCacheDisabled If true, temporary cache data won't be persisted
   */
  public end(isCacheDisabled = false): void {
    if (!this.running) {
      throw new PilotError(
        "Pilot is not running. Please call the `start()` method before ending the test flow.",
      );
    }

    this.running = false;

    if (!isCacheDisabled) this.cacheHandler.flushTemporaryCache();
  }

  /**
   * Enriches the API catalog by adding the provided categories and JS context.
   * @param categories - The categories to register.
   * @param context - (Optional) Additional JS context to register.
   */
  extendAPICatalog(
    categories: TestingFrameworkAPICatalogCategory[],
    context?: any,
  ): void {
    this.stepPerformerPromptCreator.extendAPICategories(categories);
    if (context) this.stepPerformer.extendJSContext(context);
  }

  /**
   * Performs a single test step using the provided intent.
   * @param step The intent describing the test step to perform.
   * @returns The result of the test step.
   */
  async performStep(step: string): Promise<any> {
    this.assertIsRunning();

    const screenCapture: ScreenCapturerResult =
      await this.screenCapturer.capture();

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
