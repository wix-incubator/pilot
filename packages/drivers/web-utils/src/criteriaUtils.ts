import { ELEMENT_MATCHING_CONFIG } from "./matchingConfig";
type AttributeKey = keyof typeof ELEMENT_MATCHING_CONFIG;
type ElementMatchingCriteria = {
  [K in AttributeKey]?: ReturnType<
    (typeof ELEMENT_MATCHING_CONFIG)[K]["extract"]
  >;
};

/**
 * Checks if the candidate element meets at least one “sufficient” criterion.
 */
export function meetsSufficientCriteria(
  candidate: HTMLElement,
  criteria: ElementMatchingCriteria,
): boolean {
  return Object.entries(criteria)
    .filter(
      ([key, expected]) =>
        expected != null &&
        ELEMENT_MATCHING_CONFIG[key]?.importance.type === "sufficient",
    )
    .some(([key, expected]) => {
      const config = ELEMENT_MATCHING_CONFIG[key];
      const actual = config.extract(candidate);
      return config.compare(actual, expected) === 0;
    });
}

/**
 * Checks if the candidate element meets every “mandatory” criterion.
 */
export function meetsMandatoryCriteria(
  candidate: HTMLElement,
  criteria: ElementMatchingCriteria,
): boolean {
  return Object.entries(criteria)
    .filter(
      ([key, expected]) =>
        expected != null &&
        ELEMENT_MATCHING_CONFIG[key]?.importance.type === "mandatory",
    )
    .every(([key, expected]) => {
      const config = ELEMENT_MATCHING_CONFIG[key];
      const actual = config.extract(candidate);
      return config.compare(actual, expected) === 0;
    });
}

/**
 * Computes a weighted error score for the candidate element based on “weighted” criteria.
 */
export function calculateWeightedError(
  candidate: HTMLElement,
  criteria: ElementMatchingCriteria,
): number {
  return Object.entries(criteria)
    .filter(
      ([key, expected]) =>
        expected != null &&
        ELEMENT_MATCHING_CONFIG[key]?.importance.type === "weighted",
    )
    .reduce((sum, [key, expected]) => {
      const config = ELEMENT_MATCHING_CONFIG[key];
      const actual = config.extract(candidate);
      const error = config.compare(actual, expected);
      return (
        sum +
        (config.importance as { type: "weighted"; weight: number }).weight *
          error
      );
    }, 0);
}
