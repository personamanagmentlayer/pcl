/**
 * Telemetry Initialization Tests
 *
 * Tests for OpenTelemetry SDK initialization, configuration,
 * resource detection, exporter setup, and shutdown procedures.
 */

import {
  initTelemetry,
  isInitialized_,
  getPrometheusExporter,
  shutdown,
  type TelemetryConfig,
} from '../../src/observability/telemetry';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// ═══════════════════════════════════════════════════════════════════════════════
//                              MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('@opentelemetry/sdk-node');
vi.mock('@opentelemetry/exporter-prometheus');
vi.mock('@opentelemetry/resources');
vi.mock('@opentelemetry/auto-instrumentations-node');

// ═══════════════════════════════════════════════════════════════════════════════
//                              SETUP
// ═══════════════════════════════════════════════════════════════════════════════

describe('Telemetry Initialization', () => {
  let mockNodeSDK: {
    start: ReturnType<typeof vi.fn>;
    shutdown: ReturnType<typeof vi.fn>;
  };

  let mockPrometheusExporter: {
    startServer: ReturnType<typeof vi.fn>;
    shutdown: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Reset module state by shutting down if initialized
    if (isInitialized_()) {
      await shutdown();
    }

    // Mock NodeSDK
    mockNodeSDK = {
      start: vi.fn(),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(NodeSDK).mockImplementation(() => mockNodeSDK as any);

    // Mock PrometheusExporter
    mockPrometheusExporter = {
      startServer: vi.fn(),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(PrometheusExporter).mockImplementation(
      () => mockPrometheusExporter as any
    );

    // Mock resourceFromAttributes
    vi.mocked(resourceFromAttributes).mockReturnValue({} as any);

    // Mock getNodeAutoInstrumentations
    vi.mocked(getNodeAutoInstrumentations).mockReturnValue([] as any);

    // Spy on diag
    vi.spyOn(diag, 'setLogger');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock process event handlers
    vi.spyOn(process, 'on').mockImplementation(() => process as any);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // Ensure cleanup
    if (isInitialized_()) {
      await shutdown();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              BASIC INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('initTelemetry', () => {
    it('should initialize with default configuration', () => {
      initTelemetry();

      expect(NodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: expect.anything(),
        })
      );
      expect(mockNodeSDK.start).toHaveBeenCalled();
      expect(isInitialized_()).toBe(true);
    });

    it('should throw error if already initialized', () => {
      initTelemetry();

      expect(() => initTelemetry()).toThrow(
        'Telemetry already initialized. Call shutdown() before reinitializing.'
      );
    });

    it('should create service resource with default values', () => {
      initTelemetry();

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'pcl-runtime',
        'service.version': '1.0.0',
        'deployment.environment': 'development',
      });
    });

    it('should create service resource with custom values', () => {
      const config: Partial<TelemetryConfig> = {
        serviceName: 'custom-service',
        serviceVersion: '2.0.0',
        environment: 'production',
      };

      initTelemetry(config);

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'custom-service',
        'service.version': '2.0.0',
        'deployment.environment': 'production',
      });
    });

    it('should setup shutdown handlers', () => {
      initTelemetry();

      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              CONSOLE LOGGING
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Console Exporter', () => {
    it('should not enable console logging by default', () => {
      initTelemetry();

      expect(diag.setLogger).not.toHaveBeenCalled();
    });

    it('should enable console logging when configured', () => {
      const config: Partial<TelemetryConfig> = {
        exporters: {
          console: {
            enabled: true,
          },
        },
      };

      initTelemetry(config);

      expect(diag.setLogger).toHaveBeenCalledWith(
        expect.any(DiagConsoleLogger),
        DiagLogLevel.INFO
      );
    });

    it('should use debug log level', () => {
      const config: Partial<TelemetryConfig> = {
        exporters: {
          console: {
            enabled: true,
            logLevel: 'debug',
          },
        },
      };

      initTelemetry(config);

      expect(diag.setLogger).toHaveBeenCalledWith(
        expect.any(DiagConsoleLogger),
        DiagLogLevel.DEBUG
      );
    });

    it('should use info log level', () => {
      const config: Partial<TelemetryConfig> = {
        exporters: {
          console: {
            enabled: true,
            logLevel: 'info',
          },
        },
      };

      initTelemetry(config);

      expect(diag.setLogger).toHaveBeenCalledWith(
        expect.any(DiagConsoleLogger),
        DiagLogLevel.INFO
      );
    });

    it('should use warn log level', () => {
      const config: Partial<TelemetryConfig> = {
        exporters: {
          console: {
            enabled: true,
            logLevel: 'warn',
          },
        },
      };

      initTelemetry(config);

      expect(diag.setLogger).toHaveBeenCalledWith(
        expect.any(DiagConsoleLogger),
        DiagLogLevel.WARN
      );
    });

    it('should use error log level', () => {
      const config: Partial<TelemetryConfig> = {
        exporters: {
          console: {
            enabled: true,
            logLevel: 'error',
          },
        },
      };

      initTelemetry(config);

      expect(diag.setLogger).toHaveBeenCalledWith(
        expect.any(DiagConsoleLogger),
        DiagLogLevel.ERROR
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PROMETHEUS METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Prometheus Exporter', () => {
    it('should not create Prometheus exporter when metrics disabled', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: false,
      };

      initTelemetry(config);

      expect(PrometheusExporter).not.toHaveBeenCalled();
      expect(getPrometheusExporter()).toBeNull();
    });

    it('should create Prometheus exporter when metrics enabled', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
      };

      initTelemetry(config);

      expect(PrometheusExporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 9464,
          endpoint: '/metrics',
          host: '0.0.0.0',
        }),
        expect.any(Function)
      );
      expect(mockPrometheusExporter.startServer).toHaveBeenCalled();
    });

    it('should use custom Prometheus configuration', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
        exporters: {
          prometheus: {
            port: 8080,
            endpoint: '/custom-metrics',
            host: 'localhost',
          },
        },
      };

      initTelemetry(config);

      expect(PrometheusExporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8080,
          endpoint: '/custom-metrics',
          host: 'localhost',
        }),
        expect.any(Function)
      );
    });

    it('should log Prometheus server URL', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
      };

      // Get the callback and execute it
      initTelemetry(config);
      const callback = vi.mocked(PrometheusExporter).mock.calls[0][1];
      callback();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Prometheus metrics available at')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('0.0.0.0:9464/metrics')
      );
    });

    it('should return Prometheus exporter instance', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
      };

      initTelemetry(config);

      const exporter = getPrometheusExporter();
      expect(exporter).toBe(mockPrometheusExporter);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              TRACING
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Tracing Instrumentation', () => {
    it('should not enable instrumentations when tracing disabled', () => {
      const config: Partial<TelemetryConfig> = {
        enableTracing: false,
      };

      initTelemetry(config);

      expect(NodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          instrumentations: [],
        })
      );
      expect(getNodeAutoInstrumentations).not.toHaveBeenCalled();
    });

    it('should enable instrumentations when tracing enabled', () => {
      const config: Partial<TelemetryConfig> = {
        enableTracing: true,
      };

      initTelemetry(config);

      expect(getNodeAutoInstrumentations).toHaveBeenCalledWith({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      });
      expect(NodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          instrumentations: expect.any(Array),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              CONFIGURATION MERGING
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Configuration Merging', () => {
    it('should merge partial config with defaults', () => {
      const config: Partial<TelemetryConfig> = {
        serviceName: 'custom-service',
      };

      initTelemetry(config);

      expect(resourceFromAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.name': 'custom-service',
          'service.version': '1.0.0', // Default
          'deployment.environment': 'development', // Default
        })
      );
    });

    it('should merge exporter config with defaults', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
        exporters: {
          prometheus: {
            port: 8080,
            // endpoint and host should use defaults
          },
        },
      };

      initTelemetry(config);

      expect(PrometheusExporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8080,
          endpoint: '/metrics', // Default
          host: '0.0.0.0', // Default
        }),
        expect.any(Function)
      );
    });

    it('should handle empty exporters object', () => {
      const config: Partial<TelemetryConfig> = {
        exporters: {},
      };

      expect(() => initTelemetry(config)).not.toThrow();
    });

    it('should handle undefined exporters', () => {
      const config: Partial<TelemetryConfig> = {
        serviceName: 'test',
      };

      expect(() => initTelemetry(config)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              SHUTDOWN
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('shutdown', () => {
    it('should shutdown SDK when initialized', async () => {
      initTelemetry();

      await shutdown();

      expect(mockNodeSDK.shutdown).toHaveBeenCalled();
      expect(isInitialized_()).toBe(false);
    });

    it('should do nothing if not initialized', async () => {
      await shutdown();

      expect(mockNodeSDK.shutdown).not.toHaveBeenCalled();
    });

    it('should shutdown Prometheus exporter if running', async () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
      };

      initTelemetry(config);

      await shutdown();

      expect(mockPrometheusExporter.shutdown).toHaveBeenCalled();
      expect(getPrometheusExporter()).toBeNull();
    });

    it('should not fail if Prometheus not running', async () => {
      initTelemetry();

      await expect(shutdown()).resolves.not.toThrow();
    });

    it('should handle SDK shutdown errors', async () => {
      const error = new Error('Shutdown failed');
      mockNodeSDK.shutdown.mockRejectedValue(error);

      initTelemetry();

      await expect(shutdown()).rejects.toThrow('Shutdown failed');
      expect(console.error).toHaveBeenCalledWith(
        'Error during telemetry shutdown:',
        error
      );
    });

    it('should allow reinitialization after shutdown', async () => {
      initTelemetry();
      await shutdown();

      expect(() => initTelemetry()).not.toThrow();
      expect(isInitialized_()).toBe(true);
    });

    it('should reset all state on shutdown', async () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
      };

      initTelemetry(config);
      await shutdown();

      expect(isInitialized_()).toBe(false);
      expect(getPrometheusExporter()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              STATE QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('State Queries', () => {
    describe('isInitialized_', () => {
      it('should return false before initialization', () => {
        expect(isInitialized_()).toBe(false);
      });

      it('should return true after initialization', () => {
        initTelemetry();
        expect(isInitialized_()).toBe(true);
      });

      it('should return false after shutdown', async () => {
        initTelemetry();
        await shutdown();
        expect(isInitialized_()).toBe(false);
      });
    });

    describe('getPrometheusExporter', () => {
      it('should return null when not initialized', () => {
        expect(getPrometheusExporter()).toBeNull();
      });

      it('should return null when metrics disabled', () => {
        const config: Partial<TelemetryConfig> = {
          enableMetrics: false,
        };

        initTelemetry(config);
        expect(getPrometheusExporter()).toBeNull();
      });

      it('should return exporter when metrics enabled', () => {
        const config: Partial<TelemetryConfig> = {
          enableMetrics: true,
        };

        initTelemetry(config);
        expect(getPrometheusExporter()).toBe(mockPrometheusExporter);
      });

      it('should return null after shutdown', async () => {
        const config: Partial<TelemetryConfig> = {
          enableMetrics: true,
        };

        initTelemetry(config);
        await shutdown();
        expect(getPrometheusExporter()).toBeNull();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle both metrics and tracing enabled', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
        enableTracing: true,
      };

      initTelemetry(config);

      expect(PrometheusExporter).toHaveBeenCalled();
      expect(getNodeAutoInstrumentations).toHaveBeenCalled();
      expect(NodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          metricReader: mockPrometheusExporter,
          instrumentations: expect.any(Array),
        })
      );
    });

    it('should handle both metrics and tracing disabled', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: false,
        enableTracing: false,
      };

      initTelemetry(config);

      expect(PrometheusExporter).not.toHaveBeenCalled();
      expect(getNodeAutoInstrumentations).not.toHaveBeenCalled();
      expect(NodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          metricReader: undefined,
          instrumentations: [],
        })
      );
    });

    it('should handle empty string service name', () => {
      const config: Partial<TelemetryConfig> = {
        serviceName: '',
      };

      initTelemetry(config);

      expect(resourceFromAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.name': '',
        })
      );
    });

    it('should handle zero port number (falls back to default)', () => {
      const config: Partial<TelemetryConfig> = {
        enableMetrics: true,
        exporters: {
          prometheus: {
            port: 0, // 0 is falsy, will use default 9464
          },
        },
      };

      initTelemetry(config);

      // Zero is treated as falsy and falls back to default
      expect(PrometheusExporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 9464, // Falls back to default
          endpoint: '/metrics',
          host: '0.0.0.0',
        }),
        expect.any(Function)
      );
    });

    it('should handle missing serviceVersion', () => {
      const config: Partial<TelemetryConfig> = {
        serviceName: 'test-service',
        // serviceVersion not provided
      };

      initTelemetry(config);

      expect(resourceFromAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.version': '1.0.0', // Default
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              INTEGRATION SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Integration Scenarios', () => {
    it('should support production configuration', () => {
      const config: Partial<TelemetryConfig> = {
        serviceName: 'pcl-runtime',
        serviceVersion: '2.0.0',
        environment: 'production',
        enableMetrics: true,
        enableTracing: true,
        exporters: {
          prometheus: {
            port: 9464,
            endpoint: '/metrics',
            host: '0.0.0.0',
          },
          console: {
            enabled: false,
          },
        },
      };

      initTelemetry(config);

      expect(isInitialized_()).toBe(true);
      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'pcl-runtime',
        'service.version': '2.0.0',
        'deployment.environment': 'production',
      });
      expect(PrometheusExporter).toHaveBeenCalled();
      expect(getNodeAutoInstrumentations).toHaveBeenCalled();
      expect(diag.setLogger).not.toHaveBeenCalled();
    });

    it('should support development configuration', () => {
      const config: Partial<TelemetryConfig> = {
        serviceName: 'pcl-runtime-dev',
        environment: 'development',
        enableMetrics: true,
        enableTracing: true,
        exporters: {
          console: {
            enabled: true,
            logLevel: 'debug',
          },
        },
      };

      initTelemetry(config);

      expect(isInitialized_()).toBe(true);
      expect(diag.setLogger).toHaveBeenCalledWith(
        expect.any(DiagConsoleLogger),
        DiagLogLevel.DEBUG
      );
    });

    it('should support minimal configuration', () => {
      initTelemetry({});

      expect(isInitialized_()).toBe(true);
      expect(mockNodeSDK.start).toHaveBeenCalled();
    });
  });
});
