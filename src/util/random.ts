const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a random string made of numbers and upper-case letters.
 *
 * @param length length of the string to generate
 * @returns random string
 */
export const randomString = (length: number): string => {
  let result = '';
  for (let i = length; i > 0; i -= 1)
    result += chars[Math.floor(Math.random() * chars.length)];

  return result;
};
