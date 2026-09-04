---
name: edge-computing-expert
version: 1.1.0
description: >-
  Design and implement production-grade edge computing solutions including CDN
  optimization, fog computing architectures, and distributed edge workloads. Use when the
  user mentions edge computing, CDN or edge caching, fog computing, MEC, IoT edge
  workloads, or latency-sensitive distributed deployments.
category: domains
tags:
  [
    edge-computing,
    cdn,
    fog-computing,
    distributed-systems,
    iot-edge,
    5g-edge,
    mec,
    latency,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - WebSearch
metadata:
  author: PCL Standard Library
  complexity: expert
  estimated-time: 45 minutes
---

# Edge Computing Expert

Design and implement production-grade edge computing solutions including CDN optimization, fog computing architectures, and distributed edge workloads.

## Learning Objectives

- Master edge computing architectures and patterns
- Implement CDN optimization and caching strategies
- Build fog computing distributed systems
- Deploy edge workloads with container orchestration
- Optimize for ultra-low latency applications

## Prerequisites

- Strong understanding of distributed systems
- Knowledge of networking and protocols
- Experience with containers and orchestration
- Familiarity with cloud computing concepts

## Core Concepts

### Edge Computing Architecture

Computing paradigm that brings data processing closer to data sources (IoT devices, users, sensors) rather than centralized cloud data centers. Reduces latency, bandwidth costs, and enables real-time processing.

### Content Delivery Networks (CDN)

Geographically distributed network of proxy servers that cache and deliver content from locations closer to end users. Improves load times, reduces origin server load, and enhances availability.

### Fog Computing

Decentralized computing infrastructure where data, compute, storage, and applications are distributed between the data source and the cloud. Extends cloud capabilities to the edge of the network.

### Multi-Access Edge Computing (MEC)

Network architecture providing IT and cloud computing capabilities at the edge of mobile networks. Enables ultra-low latency applications by processing data near 5G base stations.

### Edge Orchestration

Management and coordination of distributed edge workloads across heterogeneous edge infrastructure. Includes deployment, scaling, monitoring, and failover of edge services.

## Best Practices

### Edge Architecture Design

- Place edge nodes based on user density and latency requirements
- Implement multi-tier edge hierarchy (device → edge → regional → cloud)
- Design for intermittent connectivity and offline operation
- Use event-driven architectures for asynchronous processing
- Implement circuit breakers and fallback mechanisms
- Distribute workloads based on data locality
- Plan for edge node heterogeneity

### CDN Optimization

- Implement intelligent cache warming for popular content
- Use adaptive TTLs based on content access patterns
- Enable compression and content optimization
- Implement stale-while-revalidate patterns
- Use cache keys that include relevant parameters
- Monitor cache hit rates and optimize policies
- Implement origin shielding to protect backend

### Performance & Latency

- Measure and optimize for P99 latency, not just average
- Use connection pooling and keep-alive
- Implement request coalescing for cache misses
- Use HTTP/2 or HTTP/3 for multiplexing
- Optimize payload sizes and use efficient formats
- Implement predictive prefetching
- Monitor network conditions and adapt

### Security at the Edge

- Implement DDoS protection at edge layers
- Use TLS everywhere, including edge-to-edge
- Validate and sanitize all inputs at edge
- Implement rate limiting and throttling
- Use secure boot and attestation for edge devices
- Encrypt data at rest on edge nodes
- Implement zero-trust network architecture

## Anti-Patterns

### Common Mistakes

- Centralizing too much logic that should be at edge
- Not handling network partitions gracefully
- Ignoring data consistency challenges
- Over-caching dynamic or personalized content
- Not monitoring edge node health
- Inadequate capacity planning for edge nodes
- Treating edge nodes as simple caches

### Design Issues

- Single points of failure in edge architecture
- Not accounting for edge node resource constraints
- Ignoring data sovereignty and regulatory requirements
- Poor cache invalidation strategies
- Not implementing proper observability
- Lack of automated failover mechanisms
- Insufficient testing of edge scenarios

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Edge Computing Node Manager, CDN Cache Optimization System

## Resources

### Edge Platforms & Tools

- AWS Wavelength - 5G edge computing
- Azure Edge Zones - Edge services
- Google Distributed Cloud Edge
- Cloudflare Workers - Serverless edge
- Fastly Compute@Edge
- Section.io - Edge as a Service
- KubeEdge - Kubernetes edge orchestration

### CDN Providers

- Cloudflare - Global CDN and edge
- Akamai - Enterprise CDN
- Fastly - Programmable CDN
- AWS CloudFront
- Azure CDN
- Google Cloud CDN

### Technologies

- K3s - Lightweight Kubernetes for edge
- EdgeX Foundry - IoT edge framework
- Apache OpenWhisk - Serverless platform
- NGINX - Edge proxy and load balancer
- Envoy Proxy - Service mesh
- Varnish - HTTP cache

### Learning Resources

- LF Edge - Linux Foundation edge projects
- Edge Computing Consortium
- ETSI MEC specifications
- State of the Edge Report
- Edge Native Application Principles
- CDN performance optimization guides

---

_Part of the PCL Standard Library - Deploy computing at the edge for ultra-low latency applications._
