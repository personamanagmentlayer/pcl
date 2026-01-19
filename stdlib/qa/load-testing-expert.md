---
description: Expert in performance and load testing using JMeter, k6, Gatling, load patterns, metrics analysis, and performance optimization
keywords: [load-testing, performance-testing, jmeter, k6, gatling, stress-testing, performance-metrics, scalability]
category: qa
expertise_level: expert
---

# Load Testing Expert

## Core Concepts

### Load Testing Types
- **Load Testing** - Expected load performance
- **Stress Testing** - Beyond capacity limits
- **Spike Testing** - Sudden load increases
- **Soak Testing** - Extended duration performance
- **Scalability Testing** - System growth capacity
- **Volume Testing** - Large data handling

### Key Metrics
- **Response Time** - Request completion time
- **Throughput** - Requests per second (RPS)
- **Error Rate** - Percentage of failed requests
- **Latency** - Time to first byte (TTFB)
- **Concurrent Users** - Simultaneous active users
- **Resource Utilization** - CPU, memory, network

### Tools & Frameworks
- **Apache JMeter** - Java-based load testing
- **k6** - Modern JavaScript load testing
- **Gatling** - Scala-based performance testing
- **Locust** - Python-based load testing
- **Artillery** - Node.js load testing
- **Vegeta** - Go HTTP load testing

## Implementation Examples

### k6 Load Test Script

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const loginAttempts = new Counter('login_attempts');

// Test configuration
export const options = {
    stages: [
        { duration: '2m', target: 100 },  // Ramp-up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Ramp-up to 200 users
        { duration: '5m', target: 200 },  // Stay at 200 users
        { duration: '2m', target: 0 },    // Ramp-down to 0 users
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'errors': ['rate<0.1'],
        'http_req_failed': ['rate<0.05'],
    },
};

// Test data
const users = JSON.parse(open('./users.json'));

export function setup() {
    // Setup code (runs once)
    console.log('Starting load test...');
    return { timestamp: Date.now() };
}

export default function (data) {
    const user = users[Math.floor(Math.random() * users.length)];
    const baseUrl = 'https://api.example.com';

    // Login
    const loginStart = Date.now();
    const loginRes = http.post(`${baseUrl}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Login' }
    });

    loginAttempts.add(1);
    loginDuration.add(Date.now() - loginStart);

    const loginSuccess = check(loginRes, {
        'login status is 200': (r) => r.status === 200,
        'login response has token': (r) => r.json('token') !== undefined,
    });

    errorRate.add(!loginSuccess);

    if (!loginSuccess) {
        console.error(`Login failed for user ${user.email}`);
        return;
    }

    const token = loginRes.json('token');
    const authHeaders = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        tags: { name: 'Authenticated Request' }
    };

    sleep(1); // Think time

    // Get user profile
    const profileRes = http.get(`${baseUrl}/profile`, authHeaders);
    check(profileRes, {
        'profile status is 200': (r) => r.status === 200,
        'profile has user data': (r) => r.json('user') !== undefined,
    });

    sleep(2);

    // Create resource
    const createRes = http.post(`${baseUrl}/resources`, JSON.stringify({
        name: `Resource_${Date.now()}`,
        description: 'Test resource'
    }), authHeaders);

    check(createRes, {
        'create status is 201': (r) => r.status === 201,
        'create response has id': (r) => r.json('id') !== undefined,
    });

    sleep(1);

    // List resources
    const listRes = http.get(`${baseUrl}/resources?page=1&limit=20`, authHeaders);
    check(listRes, {
        'list status is 200': (r) => r.status === 200,
        'list has items': (r) => r.json('items').length > 0,
    });

    sleep(2);
}

export function teardown(data) {
    // Cleanup code (runs once)
    console.log(`Load test completed. Duration: ${Date.now() - data.timestamp}ms`);
}

export function handleSummary(data) {
    return {
        'summary.json': JSON.stringify(data),
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}
```

### JMeter Test Plan (XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0">
    <hashTree>
        <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="API Load Test">
            <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
                <collectionProp name="Arguments.arguments">
                    <elementProp name="BASE_URL" elementType="Argument">
                        <stringProp name="Argument.name">BASE_URL</stringProp>
                        <stringProp name="Argument.value">https://api.example.com</stringProp>
                    </elementProp>
                    <elementProp name="THREADS" elementType="Argument">
                        <stringProp name="Argument.name">THREADS</stringProp>
                        <stringProp name="Argument.value">100</stringProp>
                    </elementProp>
                </collectionProp>
            </elementProp>
        </TestPlan>

        <hashTree>
            <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="User Threads">
                <stringProp name="ThreadGroup.num_threads">${THREADS}</stringProp>
                <stringProp name="ThreadGroup.ramp_time">60</stringProp>
                <longProp name="ThreadGroup.duration">300</longProp>
                <boolProp name="ThreadGroup.scheduler">true</boolProp>
            </ThreadGroup>

            <hashTree>
                <!-- HTTP Request Defaults -->
                <ConfigTestElement guiclass="HttpDefaultsGui" testclass="ConfigTestElement">
                    <elementProp name="HTTPsampler.Arguments" elementType="Arguments"/>
                    <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
                    <stringProp name="HTTPSampler.protocol">https</stringProp>
                </ConfigTestElement>

                <!-- Cookie Manager -->
                <CookieManager guiclass="CookiePanel" testclass="CookieManager">
                    <boolProp name="CookieManager.clearEachIteration">false</boolProp>
                </CookieManager>

                <!-- Login Request -->
                <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Login">
                    <stringProp name="HTTPSampler.path">/auth/login</stringProp>
                    <stringProp name="HTTPSampler.method">POST</stringProp>
                    <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
                    <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
                        <collectionProp name="Arguments.arguments">
                            <elementProp name="" elementType="HTTPArgument">
                                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                                <stringProp name="Argument.value">{"email":"user@example.com","password":"password123"}</stringProp>
                                <stringProp name="Argument.metadata">=</stringProp>
                            </elementProp>
                        </collectionProp>
                    </elementProp>
                    <stringProp name="HTTPSampler.contentEncoding">UTF-8</stringProp>
                </HTTPSamplerProxy>

                <!-- Response Assertions -->
                <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion">
                    <collectionProp name="Asserion.test_strings">
                        <stringProp name="49586">200</stringProp>
                    </collectionProp>
                    <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
                </ResponseAssertion>

                <!-- Listeners -->
                <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report"/>
                <ResultCollector guiclass="ViewResultsFullVisualizer" testclass="ResultCollector" testname="View Results Tree"/>
            </hashTree>
        </hashTree>
    </hashTree>
</jmeterTestPlan>
```

### Gatling Load Test (Scala)

```scala
// LoadTestSimulation.scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class LoadTestSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling Load Test")

  val feeder = csv("users.csv").random

  val login = exec(http("Login")
    .post("/auth/login")
    .body(StringBody("""{"email":"${email}","password":"${password}"}""")).asJson
    .check(status.is(200))
    .check(jsonPath("$.token").saveAs("authToken"))
  )

  val getProfile = exec(http("Get Profile")
    .get("/profile")
    .header("Authorization", "Bearer ${authToken}")
    .check(status.is(200))
  )

  val createResource = exec(http("Create Resource")
    .post("/resources")
    .header("Authorization", "Bearer ${authToken}")
    .body(StringBody("""{"name":"Test Resource","description":"Load test"}""")).asJson
    .check(status.is(201))
    .check(jsonPath("$.id").saveAs("resourceId"))
  )

  val listResources = exec(http("List Resources")
    .get("/resources?page=1&limit=20")
    .header("Authorization", "Bearer ${authToken}")
    .check(status.is(200))
  )

  val scn = scenario("API Load Test")
    .feed(feeder)
    .exec(login)
    .pause(1)
    .exec(getProfile)
    .pause(2)
    .exec(createResource)
    .pause(1)
    .exec(listResources)
    .pause(2)

  setUp(
    scn.inject(
      rampUsers(100) during (2 minutes),
      constantUsersPerSec(50) during (5 minutes),
      rampUsers(200) during (2 minutes),
      constantUsersPerSec(100) during (5 minutes)
    )
  ).protocols(httpProtocol)
   .assertions(
     global.responseTime.max.lt(5000),
     global.responseTime.percentile3.lt(2000),
     global.successfulRequests.percent.gt(95)
   )
}
```

### Python Locust Example

```python
# locustfile.py
from locust import HttpUser, task, between
import random
import json

class APIUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://api.example.com"

    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post("/auth/login", json={
            "email": "user@example.com",
            "password": "password123"
        })

        if response.status_code == 200:
            self.token = response.json()["token"]
            self.client.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
        else:
            self.token = None

    @task(3)
    def get_profile(self):
        """Get user profile - higher weight"""
        with self.client.get("/profile", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Got status code {response.status_code}")

    @task(2)
    def list_resources(self):
        """List resources"""
        page = random.randint(1, 10)
        self.client.get(f"/resources?page={page}&limit=20", name="/resources")

    @task(1)
    def create_resource(self):
        """Create new resource - lower weight"""
        resource_data = {
            "name": f"Resource_{random.randint(1000, 9999)}",
            "description": "Load test resource"
        }

        with self.client.post("/resources", json=resource_data, catch_response=True) as response:
            if response.status_code == 201:
                resource_id = response.json()["id"]
                response.success()

                # Follow up with get request
                self.client.get(f"/resources/{resource_id}")
            else:
                response.failure(f"Failed to create resource: {response.status_code}")

    @task(1)
    def search_resources(self):
        """Search resources"""
        search_terms = ["test", "demo", "example", "sample"]
        query = random.choice(search_terms)

        self.client.get(f"/resources/search?q={query}")

    def on_stop(self):
        """Logout when stopping"""
        if self.token:
            self.client.post("/auth/logout")

# Run with: locust -f locustfile.py --users 100 --spawn-rate 10
```

## Best Practices

### Test Design
- Start with baseline performance
- Define clear performance goals
- Use realistic load patterns
- Include think time between requests
- Test with production-like data
- Monitor system resources

### Load Patterns
- Ramp-up gradually
- Test at sustained load
- Include spike scenarios
- Test soak/endurance
- Validate under stress
- Test auto-scaling

### Metrics & Analysis
- Define SLAs upfront
- Monitor response times (p50, p95, p99)
- Track error rates
- Measure throughput
- Monitor resource utilization
- Analyze bottlenecks

### Environment
- Use dedicated test environment
- Match production configuration
- Isolate test traffic
- Monitor database performance
- Test with CDN if applicable
- Include third-party dependencies

## Anti-Patterns

### Common Mistakes
- Testing from single location only
- Not ramping up load gradually
- Ignoring think time
- Testing without monitoring
- No baseline for comparison
- Testing in production

### Test Design Issues
- Unrealistic load patterns
- Missing data variation
- No error handling
- Hard-coded test data
- Ignoring cache effects
- Not testing edge cases

### Analysis Problems
- Focusing only on averages
- Ignoring outliers
- Not correlating metrics
- Missing resource bottlenecks
- No root cause analysis
- Incomplete reporting

## Resources

### Official Documentation
- [k6 Documentation](https://k6.io/docs/) - Modern load testing
- [JMeter Manual](https://jmeter.apache.org/usermanual/index.html) - Complete guide
- [Gatling Documentation](https://gatling.io/docs/current/) - Performance testing
- [Locust Documentation](https://docs.locust.io/) - Python load testing

### Learning Resources
- [Performance Testing Guidance](https://www.perfmatrix.com/) - Best practices
- [k6 YouTube](https://www.youtube.com/@k6test) - Video tutorials
- [JMeter Academy](https://www.blazemeter.com/jmeter-tutorial) - Training
- [Awesome Load Testing](https://github.com/topics/load-testing) - Curated resources

### Tools & Platforms
- [BlazeMeter](https://www.blazemeter.com/) - JMeter cloud platform
- [k6 Cloud](https://k6.io/cloud/) - k6 SaaS platform
- [Grafana Cloud k6](https://grafana.com/products/cloud/k6/) - Monitoring integration
- [Artillery Pro](https://www.artillery.io/) - Enterprise features

### Community Resources
- [k6 Community](https://community.k6.io/) - Forums
- [JMeter Forum](https://jmeter.apache.org/mail2.html) - Mailing lists
- [Load Testing Slack](https://k6.io/slack) - k6 Slack channel
- [Performance Testing Reddit](https://www.reddit.com/r/QualityAssurance/) - Discussions
