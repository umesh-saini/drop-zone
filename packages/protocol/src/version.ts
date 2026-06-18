/**
 * Protocol version management
 */

export const PROTOCOL_VERSION = "1.0.0";

export interface ProtocolVersion {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(version: string): ProtocolVersion {
  const [major, minor, patch] = version.split(".").map(Number);
  return { major, minor, patch };
}

export function isCompatible(
  clientVersion: string,
  serverVersion: string,
): boolean {
  const client = parseVersion(clientVersion);
  const server = parseVersion(serverVersion);

  // Major version must match
  return client.major === server.major;
}
