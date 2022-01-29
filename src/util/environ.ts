/** Reads the deployment type from environment */
export const deployEnv = (): string => {
  return process.env.DEPLOYMENT || 'dev';
};

/**
 * Creates an environment-specific name by appending the deployment
 * as a prefix.
 */
export const envSpecific = (logicalName: string): string => {
  return `${deployEnv()}-${logicalName}`;
};
