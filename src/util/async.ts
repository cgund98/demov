/* eslint-disable no-await-in-loop */

/**
 * Helper method for running forEach loops on asynchronous functions
 */
export async function forEach<T>(arr: Array<T>, callback: (el: T, index: number) => Promise<void>): Promise<void> {
  for (let index = 0; index < arr.length; index += 1) {
    await callback(arr[index], index);
  }
}

export async function map<T>(arr: Array<T>, callback: (el: T, index: number) => Promise<void>): Promise<void> {
  for (let index = 0; index < arr.length; index += 1) {
    await callback(arr[index], index);
  }
}
