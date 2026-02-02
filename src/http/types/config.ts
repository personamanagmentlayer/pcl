/**
 * Server configuration types
 */

import type { CorsOptions } from 'cors';

export interface RegistryConfig {
  /** Server port */
  port: number;
  /** Server host */
  host: string;
  /** CORS configuration */
  cors: CorsOptions;
  /** JWT secret (from environment) */
  jwtSecret?: string;
  /** Token expiry */
  tokenExpiry?: string;
  /** Refresh token expiry */
  refreshTokenExpiry?: string;
}
