---
name: load-testing-expert
version: 1.1.0
description: >-
  Expert in performance and load testing using JMeter, k6, Gatling, load patterns, metrics
  analysis, and performance optimization. Use when the user mentions performance, testing,
  QA, scalability, performance testing, or JMeter, or when the task involves Load Testing
  Types, Key Metrics, Tools & Frameworks, or k6 Load Test Script.
category: qa
tags:
  [
    performance,
    load-testing,
    testing,
    qa,
    scalability,
    performance-testing,
    jmeter,
    k6,
    gatling,
    stress-testing,
    performance-metrics,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: expert
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

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — k6 Load Test Script, JMeter Test Plan (XML), Gatling Load Test (Scala), Python Locust Example

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
