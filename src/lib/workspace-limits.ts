/** Maximum JSON size for a single full-workspace save. Keep client and API in sync.
 * 2 MiB is intentionally below common serverless request-body ceilings.
 * A larger data model will need incremental API writes rather than no limit.
 */
export const MAX_WORKSPACE_REQUEST_BYTES = 2 * 1024 * 1024;

/** Measure encoded UTF-8 bytes rather than JavaScript string length. */
export function jsonByteLength(serialized: string) {
  return new TextEncoder().encode(serialized).byteLength;
}
