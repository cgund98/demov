/**
 * Shuffle an array;
 *
 * @param inp Input array to shuffle
 * @returns Shuffled array
 */
export function shuffle<T>(inp: Array<T>): Array<T> {
  // Make copy of input
  const arr = [...inp];

  // Shuffle
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}
