---
name: chaos-engineering-expert
version: 1.1.0
description: >-
  Expert in chaos engineering principles, failure injection, resilience testing, Chaos
  Monkey, Gremlin, and building fault-tolerant systems. Use when the user mentions
  reliability, testing, SRE, resilience, failure injection, or resilience testing, or when
  the task involves Chaos Engineering Principles, Failure Types, Tools & Platforms, or
  Chaos Toolkit Experiment.
category: qa
tags:
  [
    chaos-engineering,
    reliability,
    testing,
    sre,
    resilience,
    failure-injection,
    resilience-testing,
    chaos-monkey,
    gremlin,
    fault-tolerance,
    site-reliability,
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

# Chaos Engineering Expert

## Core Concepts

### Chaos Engineering Principles

- **Hypothesis-Driven** - Define expected system behavior
- **Production Testing** - Test in real environments
- **Minimize Blast Radius** - Start small, expand gradually
- **Automation** - Continuous chaos experiments
- **Learn and Improve** - Build resilience iteratively
- **Observability** - Monitor system behavior

### Failure Types

- **Network Failures** - Latency, packet loss, partitions
- **Resource Exhaustion** - CPU, memory, disk
- **Service Failures** - Process crashes, unavailability
- **Data Corruption** - Corrupt files, bad data
- **Time Drift** - Clock skew, NTP failures
- **Dependency Failures** - Third-party service outages

### Tools & Platforms

- **Chaos Monkey** - Netflix's random termination tool
- **Gremlin** - Enterprise chaos engineering platform
- **Chaos Toolkit** - Open-source chaos experiments
- **Litmus** - Kubernetes chaos engineering
- **Pumba** - Docker chaos testing
- **Toxiproxy** - Network condition simulation

## Best Practices

### Experiment Design

- Start with hypothesis
- Define steady-state metrics
- Begin with small blast radius
- Test in staging first
- Automate experiments
- Document learnings

### Safety Measures

- Implement circuit breakers
- Set up monitoring/alerting
- Have rollback procedures
- Limit blast radius
- Run during business hours initially
- Get stakeholder buy-in

### Observability

- Monitor golden signals
- Track error rates
- Measure latency (p50, p95, p99)
- Monitor resource utilization
- Log all chaos events
- Correlate metrics

### Culture

- Foster blameless culture
- Share learnings openly
- Make chaos regular practice
- Train teams on chaos engineering
- Start with game days
- Celebrate failures as learning

## Anti-Patterns

### Common Mistakes

- Testing in production without preparation
- No rollback plan
- Ignoring blast radius
- Running attacks during incidents
- No monitoring in place
- Blaming teams for failures

### Experiment Design Issues

- No clear hypothesis
- Undefined success criteria
- Too broad scope initially
- Missing steady-state verification
- No automation
- Poor documentation

### Cultural Problems

- Blame-focused culture
- Resistance to controlled failure
- Lack of stakeholder support
- No learning from experiments
- Chaos for chaos sake
- Security concerns ignored

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Chaos Toolkit Experiment, Gremlin Attack Scenarios, Custom Chaos Tool (Python), Kubernetes Chaos with Litmus

## Resources

### Official Documentation

- [Principles of Chaos Engineering](https://principlesofchaos.org/) - Core principles
- [Chaos Toolkit](https://chaostoolkit.org/reference/api/experiment/) - Tool docs
- [Gremlin Documentation](https://www.gremlin.com/docs/) - Platform guide
- [Litmus Documentation](https://docs.litmuschaos.io/) - Kubernetes chaos

### Learning Resources

- [Chaos Engineering Book](https://www.oreilly.com/library/view/chaos-engineering/9781492043867/) - O'Reilly
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/) - SRE practices
- [Awesome Chaos Engineering](https://github.com/dastergon/awesome-chaos-engineering) - Resources
- [Chaos Engineering YouTube](https://www.youtube.com/results?search_query=chaos+engineering) - Videos

### Tools & Platforms

- [Chaos Monkey](https://netflix.github.io/chaosmonkey/) - Netflix tool
- [Gremlin Free](https://www.gremlin.com/community) - Free tier
- [Chaos Mesh](https://chaos-mesh.org/) - Kubernetes platform
- [Toxiproxy](https://github.com/Shopify/toxiproxy) - Network simulator

### Community Resources

- [Chaos Engineering Slack](https://chaos-community.slack.com/) - Community
- [Reddit SRE](https://www.reddit.com/r/sre/) - Discussions
- [Chaos Conf](https://www.chaosconf.io/) - Annual conference
- [LinkedIn Groups](https://www.linkedin.com/groups/) - Professional networks
