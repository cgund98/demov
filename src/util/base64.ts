// Decode a base64-encoded string
export const decodeB64 = (input: string): string => {
  const buff = Buffer.from(input, 'base64');
  const out = buff.toString('utf-8');

  return out;
};
