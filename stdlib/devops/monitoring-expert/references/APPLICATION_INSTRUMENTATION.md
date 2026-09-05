# Monitoring Expert — Application Instrumentation

Reference material for the `monitoring-expert` skill. See [SKILL.md](../SKILL.md).

## Application Instrumentation

### Node.js (Express)

```typescript
// Install: npm install prom-client express-prom-bundle
import express from 'express';
import promBundle from 'express-prom-bundle';
import { register, Counter, Histogram, Gauge } from 'prom-client';

const app = express();

// Automatic metrics for all endpoints
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'myapp' },
  promClient: { collectDefaultMetrics: {} },
});

app.use(metricsMiddleware);

// Custom metrics
const ordersTotal = new Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status', 'payment_method'],
});

const orderValue = new Histogram({
  name: 'order_value_dollars',
  help: 'Order value in dollars',
  buckets: [10, 50, 100, 500, 1000, 5000],
});

const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

// Use metrics in your code
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);

  ordersTotal.inc({ status: 'created', payment_method: order.paymentMethod });
  orderValue.observe(order.total);

  res.json(order);
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(8080, () => {
  console.log('Server running on :8080');
  console.log('Metrics available at http://localhost:8080/metrics');
});
```

### Python (Flask)

```python
# Install: pip install prometheus-flask-exporter
from flask import Flask
from prometheus_flask_exporter import PrometheusMetrics
from prometheus_client import Counter, Histogram, Gauge

app = Flask(__name__)
metrics = PrometheusMetrics(app)

# Custom metrics
orders_total = Counter(
    'orders_total',
    'Total number of orders',
    ['status', 'payment_method']
)

order_value = Histogram(
    'order_value_dollars',
    'Order value in dollars',
    buckets=[10, 50, 100, 500, 1000, 5000]
)

active_users = Gauge(
    'active_users',
    'Number of active users'
)

@app.route('/orders', methods=['POST'])
def create_order():
    order = process_order(request.json)

    orders_total.labels(
        status='created',
        payment_method=order['payment_method']
    ).inc()

    order_value.observe(order['total'])

    return jsonify(order)

@app.route('/health')
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
    # Metrics available at /metrics
```

### Go

```go
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    ordersTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "orders_total",
            Help: "Total number of orders",
        },
        []string{"status", "payment_method"},
    )

    orderValue = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "order_value_dollars",
            Help:    "Order value in dollars",
            Buckets: []float64{10, 50, 100, 500, 1000, 5000},
        },
    )

    activeUsers = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_users",
            Help: "Number of active users",
        },
    )
)

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
    order := processOrder(r.Body)

    ordersTotal.WithLabelValues(
        "created",
        order.PaymentMethod,
    ).Inc()

    orderValue.Observe(order.Total)

    json.NewEncoder(w).Encode(order)
}

func main() {
    http.HandleFunc("/orders", createOrderHandler)
    http.Handle("/metrics", promhttp.Handler())

    http.ListenAndServe(":8080", nil)
}
```
