---
name: serverless-expert
version: 1.1.0
description: >-
  Design and implement production-grade serverless applications with optimal performance,
  cost efficiency, and scalability. Use when the user mentions serverless or FaaS, AWS
  Lambda, Azure Functions, Cloud Functions, cold starts, event-driven architecture, or API
  Gateway-fronted workloads.
category: domains
tags:
  [
    serverless,
    faas,
    lambda,
    azure-functions,
    event-driven,
    cloud-native,
    microservices,
    api-gateway,
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
  estimated-time: 45 minutes
---

# Serverless Expert

Design and implement production-grade serverless applications with optimal performance, cost efficiency, and scalability.

## Learning Objectives

- Master serverless architecture patterns and best practices
- Build event-driven systems with AWS Lambda and Azure Functions
- Implement Function-as-a-Service (FaaS) applications
- Design for cold starts and optimization strategies
- Integrate serverless with API Gateway and event sources

## Prerequisites

- Strong cloud platform knowledge (AWS/Azure/GCP)
- Understanding of event-driven architectures
- Knowledge of microservices patterns
- Familiarity with Infrastructure as Code

## Core Concepts

### Function-as-a-Service (FaaS)

Cloud computing model where functions execute in response to events without managing servers. Platform automatically provisions, scales, and manages infrastructure based on demand.

### Event-Driven Architecture

Design paradigm where functions react to events from various sources (HTTP requests, database changes, file uploads, queues). Enables loose coupling and scalability.

### Cold Starts & Warm Starts

Cold start occurs when function executes for first time or after idle period, requiring initialization. Warm starts reuse existing execution environment for faster response times.

### Serverless Orchestration

Coordination of multiple serverless functions in workflows using services like AWS Step Functions or Azure Durable Functions. Enables complex business logic across distributed functions.

### Serverless Security

Security considerations including IAM roles, function permissions, API authentication, secrets management, and VPC networking for serverless workloads.

## Best Practices

### Function Design

- Keep functions small and single-purpose
- Design for idempotency to handle retries safely
- Use environment variables for configuration
- Implement proper error handling and logging
- Return appropriate HTTP status codes
- Version functions for gradual rollouts
- Minimize cold start impact with provisioned concurrency

### Performance Optimization

- Reuse connections and clients outside handler
- Use connection pooling for databases
- Minimize package size and dependencies
- Enable Lambda layers for shared code
- Optimize memory allocation (CPU scales with memory)
- Use async/await for concurrent operations
- Implement caching strategies

### Event-Driven Patterns

- Use dead letter queues for failed events
- Implement exponential backoff for retries
- Design for eventual consistency
- Use event sourcing for audit trails
- Implement circuit breakers for external services
- Batch process events when possible
- Use fan-out patterns for parallel processing

### Cost Optimization

- Right-size memory allocation
- Use reserved concurrency carefully
- Implement request throttling
- Archive logs to S3 after retention period
- Use S3 lifecycle policies
- Monitor and alert on cost anomalies
- Consider compute savings plans

## Anti-Patterns

### Common Mistakes

- Long-running functions exceeding timeout limits
- Not handling cold starts appropriately
- Synchronous processing of independent tasks
- Storing state in function memory
- Hardcoding configuration values
- Not implementing proper monitoring
- Ignoring concurrency limits
- Recursive function calls without limits

### Design Issues

- Functions doing too much (violating single responsibility)
- Tight coupling between functions
- Not using infrastructure as code
- Inadequate error handling and retries
- Missing dead letter queues
- Not implementing tracing
- Ignoring security best practices
- Poor secret management

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — AWS Lambda with Advanced Patterns, Serverless Framework Configuration

## Resources

### Serverless Platforms

- AWS Lambda - Leading FaaS platform
- Azure Functions - Microsoft serverless
- Google Cloud Functions
- Cloudflare Workers - Edge computing
- Vercel Functions - Frontend-focused
- Netlify Functions

### Frameworks & Tools

- Serverless Framework - Multi-cloud IaC
- AWS SAM - AWS native framework
- Terraform - Infrastructure as code
- Pulumi - Modern IaC with programming languages
- LocalStack - Local AWS emulation
- serverless-offline - Local development

### Monitoring & Observability

- AWS X-Ray - Distributed tracing
- CloudWatch - Logs and metrics
- Datadog - APM and monitoring
- New Relic - Observability platform
- Lumigo - Serverless monitoring
- Thundra - Debugging and profiling

### Learning Resources

- AWS Well-Architected Serverless Lens
- Serverless Architecture Patterns
- Azure Serverless Computing Cookbook
- Serverless Stack - Full-stack tutorial
- Production-Ready Serverless course
- AWS Lambda Power Tuning

---

_Part of the PCL Standard Library - Build scalable, cost-effective applications without managing servers._
