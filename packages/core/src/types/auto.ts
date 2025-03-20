/** Autopilot review section type */
export type AutoReviewSectionType = {
    /** Title of the review section */
    title: string;
    /** Emoji for the review section */
    emoji: string;
    /** Description of the review section for the prompt creation */
    description: string,
    /** Guidelines for the review section for prompt creation*/
    guidelines: string[]
}

/** Complete Autopilot review */
export type AutoReview = {
  [reviewType: string]: AutoReviewSection;
};

/**
 * Single Autopilot step execution report.
 */
export type AutoStepReport = {
  /** Screen name of the current view */
  screenDescription: string;
  /** Action plan and reasoning */
  plan: AutoStepPlan;
  /** Optional reviews */
  review?: AutoReview;
  /** Generated code */
  code?: string;
  /** Indicates if the goal was achieved */
  goalAchieved: boolean;
  /** Execution summary if exists */
  summary?: string;
};

/**
 * Complete Autopilot execution report.
 */
export type AutoReport = {
  /** Target objective */
  goal: string;
  /** Individual step reports */
  steps: AutoStepReport[];
  /** Optional final reviews */
  review?: AutoReview;
  /** Execution summary if exists */
  summary?: string;
};

/**
 * Pilot step planning output.
 */
export type AutoStepPlan = {
  /** Planned action */
  action: string;
  /** Reasoning process */
  thoughts: string;
};

/**
 * Cache value for AutoPerformer.
 * Contains all necessary data for an auto pilot step.
 */
export interface AutoPerformerCacheValue {
  /** Screen description */
  screenDescription: string;
  /** Auto pilot step plan */
  plan: AutoStepPlan;
  /** Auto pilot step review */
  review: AutoReview;
  /** Goal achievement status */
  goalAchieved: boolean;
  /** Summary */
  summary?: string;
}

/**
 * Review section content.
 */
export type AutoReviewSection = {
  /** Overall assessment */
  summary: string;
  /** Specific observations */
  findings?: string[];
  /** Numerical rating (1-10) */
  score: string;
};

/**
 * Previous pilot step record.
 */
export type AutoPreviousStep = {
  /** Screen description */
  screenDescription: string;
  /** Step description */
  step: string;
  /** Optional reviews */
  review?: AutoReview;
  /** Error */
  error?: any;
};
