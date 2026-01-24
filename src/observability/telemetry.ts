/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Telemetry Initialization
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OpenTelemetry setup for distributed tracing, metrics, and structured logging
 *
 * @packageDocumentation
 * @module @pcl/observability/telemetry
 * @version 1.0.0
 */

import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrometheusConfig {
  readonly port?: number;
  readonly endpoint?: string;
  readonly host?: string;
}

export interface JaegerConfig {
  readonly endpoint?: string;
  readonly agentHost?: string;
  readonly agentPort?: number;
}

export interface ConsoleConfig {
  readonly enabled: boolean;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface TelemetryConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly environment: string;
  readonly enableTracing: boolean;
  readonly enableMetrics: boolean;
  readonly metrics?: {
    enabled: boolean;
    port?: number;
  };
  readonly tracing?: {
    enabled: boolean;
    endpoint?: string;
  };
  readonly logging?: {
    enabled: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
  readonly exporters: {
    readonly prometheus?: PrometheusConfig;
    readonly jaeger?: JaegerConfig;
    readonly console?: ConsoleConfig;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: TelemetryConfig = {
  serviceName: 'pcl-runtime',
  serviceVersion: '1.0.0',
  environment: 'development',
  enableTracing: false,
  enableMetrics: false,
  exporters: {
    prometheus: {
      port: 9464,
      endpoint: '/metrics',
      host: '0.0.0.0',
    },
    console: {
      enabled: false,
      logLevel: 'info',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════════

let sdk: NodeSDK | null = null;
let prometheusExporter: PrometheusExporter | null = null;
let isInitialized = false;

// ═══════════════════════════════════════════════════════════════════════════════
//                              INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize OpenTelemetry SDK with provided configuration
 *
 * @param config - Telemetry configuration
 * @throws Error if already initialized
 */
export function initTelemetry(config: Partial<TelemetryConfig> = {}): void {
  if (isInitialized) {
    throw new Error(
      'Telemetry already initialized. Call shutdown() before reinitializing.'
    );
  }

  const fullConfig: TelemetryConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    exporters: {
      ...DEFAULT_CONFIG.exporters,
      ...config.exporters,
      prometheus: {
        ...DEFAULT_CONFIG.exporters.prometheus,
        ...config.exporters?.prometheus,
      },
      console: {
        enabled:
          config.exporters?.console?.enabled ??
          DEFAULT_CONFIG.exporters.console?.enabled ??
          false,
        logLevel:
          config.exporters?.console?.logLevel ||
          DEFAULT_CONFIG.exporters.console?.logLevel,
      } as ConsoleConfig,
    },
  };

  // Setup diagnostic logging if console exporter is enabled
  if (fullConfig.exporters.console?.enabled) {
    const logLevel = mapLogLevel(
      fullConfig.exporters.console.logLevel || 'info'
    );
    diag.setLogger(new DiagConsoleLogger(), logLevel);
  }

  // Create resource identifying this service
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: fullConfig.serviceName,
    [ATTR_SERVICE_VERSION]: fullConfig.serviceVersion || '1.0.0',
    'deployment.environment': fullConfig.environment,
  });

  // Setup metric reader (Prometheus)
  let metricReader: PeriodicExportingMetricReader | undefined;
  if (fullConfig.enableMetrics && fullConfig.exporters.prometheus) {
    prometheusExporter = new PrometheusExporter(
      {
        port: fullConfig.exporters.prometheus.port || 9464,
        endpoint: fullConfig.exporters.prometheus.endpoint || '/metrics',
        host: fullConfig.exporters.prometheus.host || '0.0.0.0',
      },
      () => {
        console.log(
          `Prometheus metrics available at http://${fullConfig.exporters.prometheus?.host || '0.0.0.0'}:${fullConfig.exporters.prometheus?.port || 9464}${fullConfig.exporters.prometheus?.endpoint || '/metrics'}`
        );
      }
    );

    // Start the Prometheus exporter server
    prometheusExporter.startServer();
  }

  // Initialize NodeSDK
  sdk = new NodeSDK({
    resource,
    metricReader: prometheusExporter || undefined,
    instrumentations: fullConfig.enableTracing
      ? [
          getNodeAutoInstrumentations({
            // Disable instrumentations we don't need
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-dns': { enabled: false },
            '@opentelemetry/instrumentation-net': { enabled: false },
          }),
        ]
      : [],
  });

  // Start the SDK
  sdk.start();

  isInitialized = true;

  // Setup graceful shutdown
  setupShutdownHandlers();
}

/**
 * Check if telemetry is initialized
 */
export function isInitialized_(): boolean {
  return isInitialized;
}

/**
 * Get the Prometheus exporter instance
 * @returns PrometheusExporter instance or null if not initialized
 */
export function getPrometheusExporter(): PrometheusExporter | null {
  return prometheusExporter;
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export async function shutdown(): Promise<void> {
  if (!isInitialized || !sdk) {
    return;
  }

  try {
    await sdk.shutdown();

    // Stop Prometheus server if running
    if (prometheusExporter) {
      await prometheusExporter.shutdown();
      prometheusExporter = null;
    }

    isInitialized = false;
    sdk = null;
  } catch (error) {
    console.error('Error during telemetry shutdown:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map string log level to DiagLogLevel
 */
function mapLogLevel(level: string): DiagLogLevel {
  switch (level.toLowerCase()) {
    case 'debug':
      return DiagLogLevel.DEBUG;
    case 'info':
      return DiagLogLevel.INFO;
    case 'warn':
      return DiagLogLevel.WARN;
    case 'error':
      return DiagLogLevel.ERROR;
    default:
      return DiagLogLevel.INFO;
  }
}

/**
 * Setup shutdown handlers for graceful termination
 */
function setupShutdownHandlers(): void {
  const shutdownHandler = async () => {
    try {
      await shutdown();
      process.exit(0);
    } catch (error) {
      console.error('Failed to shutdown telemetry:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
}
