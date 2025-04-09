/**
 * Simple promise-based sleep function.
 * @param ms Milliseconds to sleep.
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
