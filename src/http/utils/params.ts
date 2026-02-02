/**
 * Utility functions for HTTP route parameter handling
 */

/**
 * Extract string value from Express route parameter
 * Handles both single string and array of strings
 *
 * @param value - Route parameter value (string | string[])
 * @returns First string value if array, or the string itself
 *
 * @example
 * const userId = getStringParam(req.params.id);
 */
export function getStringParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract optional string value from Express route parameter
 * Returns undefined if value is missing
 *
 * @param value - Route parameter value (string | string[] | undefined)
 * @returns First string value if array, the string itself, or undefined
 *
 * @example
 * const filter = getOptionalStringParam(req.query.filter);
 */
export function getOptionalStringParam(
  value: string | string[] | undefined
): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract numeric value from Express route parameter
 * Handles both single string and array of strings, parsing to number
 *
 * @param value - Route parameter value (string | string[])
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed number or default value
 *
 * @example
 * const page = getNumberParam(req.query.page, 1);
 */
export function getNumberParam(
  value: string | string[] | undefined,
  defaultValue: number = 0
): number {
  if (!value) return defaultValue;
  const str = Array.isArray(value) ? value[0] : value;
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Extract boolean value from Express route parameter
 * Handles truthy string values: 'true', '1', 'yes'
 *
 * @param value - Route parameter value (string | string[])
 * @param defaultValue - Default value if parsing fails
 * @returns Boolean value or default
 *
 * @example
 * const includeArchived = getBooleanParam(req.query.archived, false);
 */
export function getBooleanParam(
  value: string | string[] | undefined,
  defaultValue: boolean = false
): boolean {
  if (!value) return defaultValue;
  const str = (Array.isArray(value) ? value[0] : value).toLowerCase();
  return ['true', '1', 'yes'].includes(str);
}
