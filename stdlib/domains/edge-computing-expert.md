# Edge Computing Expert

---

skill_id: edge-computing-expert
name: Edge Computing Expert
allowed-tools:

- Read
- Write
- Bash
- WebSearch
  category: domains
  tags: [edge-computing, cdn, fog-computing, distributed-systems, iot-edge, 5g-edge, mec, latency]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master edge computing architectures and patterns
- Implement CDN optimization and caching strategies
- Build fog computing distributed systems
- Deploy edge workloads with container orchestration
- Optimize for ultra-low latency applications
  prerequisites:
- Strong understanding of distributed systems
- Knowledge of networking and protocols
- Experience with containers and orchestration
- Familiarity with cloud computing concepts
  outcome: Design and implement production-grade edge computing solutions including CDN optimization, fog computing architectures, and distributed edge workloads

---

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

## Code Examples

### Edge Computing Node Manager

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import aiohttp
import hashlib
import json


class NodeStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"


class WorkloadType(Enum):
    COMPUTE = "compute"
    STORAGE = "storage"
    CACHE = "cache"
    GATEWAY = "gateway"
    ANALYTICS = "analytics"


@dataclass
class EdgeNode:
    node_id: str
    location: str  # Geographic location
    latitude: float
    longitude: float
    status: NodeStatus
    capacity: Dict[str, float]  # CPU, memory, storage, network
    current_load: Dict[str, float]
    deployed_workloads: List[str] = field(default_factory=list)
    last_heartbeat: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_available_capacity(self) -> Dict[str, float]:
        """Calculate remaining capacity"""
        return {
            resource: self.capacity[resource] - self.current_load.get(resource, 0)
            for resource in self.capacity
        }

    def can_handle_workload(self, requirements: Dict[str, float]) -> bool:
        """Check if node can handle additional workload"""
        available = self.get_available_capacity()
        return all(
            available.get(resource, 0) >= amount
            for resource, amount in requirements.items()
        )


@dataclass
class EdgeWorkload:
    workload_id: str
    name: str
    workload_type: WorkloadType
    container_image: str
    resource_requirements: Dict[str, float]
    environment_vars: Dict[str, str]
    ports: List[int]
    replicas: int
    affinity_rules: List[str] = field(default_factory=list)  # Node selectors
    health_check_path: str = "/health"
    max_latency_ms: int = 100


@dataclass
class WorkloadDeployment:
    deployment_id: str
    workload: EdgeWorkload
    node_id: str
    status: str  # pending, running, failed, stopped
    deployed_at: Optional[datetime] = None
    container_id: Optional[str] = None
    metrics: Dict[str, Any] = field(default_factory=dict)


class EdgeComputeOrchestrator:
    def __init__(self):
        self.nodes: Dict[str, EdgeNode] = {}
        self.workloads: Dict[str, EdgeWorkload] = {}
        self.deployments: Dict[str, WorkloadDeployment] = {}
        self.health_check_interval = 30  # seconds
        self.is_running = False

    async def start(self):
        """Start orchestrator and background tasks"""
        self.is_running = True
        await asyncio.gather(
            self.health_check_loop(),
            self.workload_monitor_loop(),
            self.auto_scaling_loop()
        )

    async def stop(self):
        """Stop orchestrator"""
        self.is_running = False

    async def register_node(self, node: EdgeNode) -> bool:
        """Register new edge node"""
        if node.node_id in self.nodes:
            return False

        self.nodes[node.node_id] = node
        node.last_heartbeat = datetime.now()

        print(f"Node registered: {node.node_id} at {node.location}")
        return True

    async def deploy_workload(self, workload: EdgeWorkload) -> List[WorkloadDeployment]:
        """Deploy workload to optimal edge nodes"""
        self.workloads[workload.workload_id] = workload

        # Find suitable nodes
        suitable_nodes = self._find_suitable_nodes(workload)

        if len(suitable_nodes) < workload.replicas:
            raise ValueError(
                f"Insufficient nodes for {workload.replicas} replicas. "
                f"Found {len(suitable_nodes)} suitable nodes."
            )

        # Select best nodes based on latency and capacity
        selected_nodes = self._select_optimal_nodes(
            suitable_nodes, workload, workload.replicas
        )

        # Deploy to selected nodes
        deployments = []
        for node_id in selected_nodes:
            deployment = await self._deploy_to_node(workload, node_id)
            deployments.append(deployment)

        return deployments

    def _find_suitable_nodes(self, workload: EdgeWorkload) -> List[EdgeNode]:
        """Find nodes that can handle the workload"""
        suitable = []

        for node in self.nodes.values():
            if node.status == NodeStatus.OFFLINE:
                continue

            # Check capacity
            if not node.can_handle_workload(workload.resource_requirements):
                continue

            # Check affinity rules
            if workload.affinity_rules:
                if not self._check_affinity(node, workload.affinity_rules):
                    continue

            suitable.append(node)

        return suitable

    def _check_affinity(self, node: EdgeNode, affinity_rules: List[str]) -> bool:
        """Check if node matches affinity rules"""
        for rule in affinity_rules:
            if "=" in rule:
                key, value = rule.split("=", 1)
                if node.metadata.get(key) != value:
                    return False
            elif rule.startswith("!"):
                # Anti-affinity
                key = rule[1:]
                if key in node.metadata:
                    return False

        return True

    def _select_optimal_nodes(
        self, nodes: List[EdgeNode], workload: EdgeWorkload, count: int
    ) -> List[str]:
        """Select best nodes based on scoring"""
        scored_nodes = []

        for node in nodes:
            score = self._calculate_node_score(node, workload)
            scored_nodes.append((score, node.node_id))

        # Sort by score (higher is better) and select top N
        scored_nodes.sort(reverse=True)
        return [node_id for _, node_id in scored_nodes[:count]]

    def _calculate_node_score(self, node: EdgeNode, workload: EdgeWorkload) -> float:
        """Calculate node suitability score"""
        score = 0.0

        # Factor 1: Available capacity (0-40 points)
        available = node.get_available_capacity()
        cpu_ratio = available.get("cpu", 0) / node.capacity.get("cpu", 1)
        memory_ratio = available.get("memory", 0) / node.capacity.get("memory", 1)
        score += (cpu_ratio + memory_ratio) * 20

        # Factor 2: Current load (0-30 points)
        load_avg = sum(node.current_load.values()) / len(node.current_load)
        capacity_avg = sum(node.capacity.values()) / len(node.capacity)
        load_ratio = 1 - (load_avg / capacity_avg) if capacity_avg > 0 else 0
        score += load_ratio * 30

        # Factor 3: Node status (0-20 points)
        status_scores = {
            NodeStatus.HEALTHY: 20,
            NodeStatus.DEGRADED: 10,
            NodeStatus.UNHEALTHY: 0,
            NodeStatus.OFFLINE: -100
        }
        score += status_scores.get(node.status, 0)

        # Factor 4: Number of existing workloads (0-10 points)
        # Prefer nodes with fewer workloads for better distribution
        workload_penalty = len(node.deployed_workloads) * 2
        score += max(0, 10 - workload_penalty)

        return score

    async def _deploy_to_node(
        self, workload: EdgeWorkload, node_id: str
    ) -> WorkloadDeployment:
        """Deploy workload to specific node"""
        deployment = WorkloadDeployment(
            deployment_id=f"{workload.workload_id}-{node_id}",
            workload=workload,
            node_id=node_id,
            status="pending",
            deployed_at=datetime.now()
        )

        self.deployments[deployment.deployment_id] = deployment

        try:
            # Deploy container to edge node (simulate with API call)
            container_id = await self._deploy_container(node_id, workload)

            # Update deployment status
            deployment.status = "running"
            deployment.container_id = container_id

            # Update node state
            node = self.nodes[node_id]
            node.deployed_workloads.append(deployment.deployment_id)
            for resource, amount in workload.resource_requirements.items():
                node.current_load[resource] = node.current_load.get(resource, 0) + amount

            print(f"Workload {workload.name} deployed to node {node_id}")

        except Exception as e:
            deployment.status = "failed"
            print(f"Deployment failed: {e}")

        return deployment

    async def _deploy_container(self, node_id: str, workload: EdgeWorkload) -> str:
        """Deploy container to edge node via API"""
        # Simulate container deployment
        await asyncio.sleep(0.1)

        container_config = {
            "image": workload.container_image,
            "environment": workload.environment_vars,
            "ports": workload.ports,
            "resources": workload.resource_requirements
        }

        # In production, this would call edge node's container runtime API
        container_id = hashlib.md5(
            f"{node_id}{workload.workload_id}".encode()
        ).hexdigest()

        return container_id

    async def health_check_loop(self):
        """Continuously monitor node health"""
        while self.is_running:
            for node in self.nodes.values():
                await self._check_node_health(node)

            await asyncio.sleep(self.health_check_interval)

    async def _check_node_health(self, node: EdgeNode):
        """Check health of a single node"""
        try:
            # Simulate health check API call
            await asyncio.sleep(0.01)

            # Check if heartbeat is recent
            if node.last_heartbeat:
                time_since_heartbeat = (datetime.now() - node.last_heartbeat).seconds

                if time_since_heartbeat > 120:
                    node.status = NodeStatus.OFFLINE
                elif time_since_heartbeat > 60:
                    node.status = NodeStatus.DEGRADED
                else:
                    # Check resource utilization
                    avg_utilization = sum(
                        node.current_load.get(r, 0) / node.capacity.get(r, 1)
                        for r in node.capacity
                    ) / len(node.capacity)

                    if avg_utilization > 0.9:
                        node.status = NodeStatus.DEGRADED
                    else:
                        node.status = NodeStatus.HEALTHY

        except Exception as e:
            print(f"Health check failed for node {node.node_id}: {e}")
            node.status = NodeStatus.UNHEALTHY

    async def workload_monitor_loop(self):
        """Monitor deployed workloads"""
        while self.is_running:
            for deployment in self.deployments.values():
                if deployment.status == "running":
                    await self._monitor_workload(deployment)

            await asyncio.sleep(10)

    async def _monitor_workload(self, deployment: WorkloadDeployment):
        """Monitor single workload deployment"""
        try:
            # Collect metrics from edge node
            metrics = await self._collect_workload_metrics(deployment)
            deployment.metrics = metrics

            # Check health endpoint
            health_ok = await self._check_workload_health(deployment)

            if not health_ok:
                print(f"Workload {deployment.workload.name} unhealthy, redeploying...")
                await self._redeploy_workload(deployment)

        except Exception as e:
            print(f"Workload monitoring failed: {e}")

    async def _collect_workload_metrics(
        self, deployment: WorkloadDeployment
    ) -> Dict[str, Any]:
        """Collect metrics from deployed workload"""
        # Simulate metrics collection
        await asyncio.sleep(0.01)

        return {
            "cpu_usage": 45.2,
            "memory_usage": 512.0,
            "network_rx": 1024000,
            "network_tx": 512000,
            "request_count": 1500,
            "avg_latency_ms": 15
        }

    async def _check_workload_health(self, deployment: WorkloadDeployment) -> bool:
        """Check workload health endpoint"""
        try:
            # Simulate health check
            await asyncio.sleep(0.01)
            return True
        except:
            return False

    async def _redeploy_workload(self, deployment: WorkloadDeployment):
        """Redeploy failed workload"""
        # Remove from current node
        await self._undeploy_from_node(deployment)

        # Deploy to new node
        new_deployment = await self.deploy_workload(deployment.workload)

    async def _undeploy_from_node(self, deployment: WorkloadDeployment):
        """Remove deployment from node"""
        node = self.nodes.get(deployment.node_id)
        if node and deployment.deployment_id in node.deployed_workloads:
            node.deployed_workloads.remove(deployment.deployment_id)

            # Release resources
            for resource, amount in deployment.workload.resource_requirements.items():
                node.current_load[resource] -= amount

        deployment.status = "stopped"

    async def auto_scaling_loop(self):
        """Auto-scale workloads based on load"""
        while self.is_running:
            for workload in self.workloads.values():
                await self._check_scaling(workload)

            await asyncio.sleep(60)

    async def _check_scaling(self, workload: EdgeWorkload):
        """Check if workload needs scaling"""
        # Get all deployments for this workload
        workload_deployments = [
            d for d in self.deployments.values()
            if d.workload.workload_id == workload.workload_id
            and d.status == "running"
        ]

        if not workload_deployments:
            return

        # Calculate average latency
        avg_latency = sum(
            d.metrics.get("avg_latency_ms", 0)
            for d in workload_deployments
        ) / len(workload_deployments)

        # Scale up if latency is too high
        if avg_latency > workload.max_latency_ms * 1.5:
            print(f"Scaling up {workload.name} due to high latency ({avg_latency}ms)")
            await self.deploy_workload(workload)

        # Scale down if latency is very low and we have extra replicas
        elif avg_latency < workload.max_latency_ms * 0.5 and len(workload_deployments) > workload.replicas:
            print(f"Scaling down {workload.name} due to low latency")
            # Remove one deployment
            await self._undeploy_from_node(workload_deployments[0])

    def get_edge_topology(self) -> Dict[str, Any]:
        """Get overview of edge infrastructure"""
        total_capacity = {
            "cpu": sum(n.capacity.get("cpu", 0) for n in self.nodes.values()),
            "memory": sum(n.capacity.get("memory", 0) for n in self.nodes.values()),
            "storage": sum(n.capacity.get("storage", 0) for n in self.nodes.values())
        }

        total_used = {
            "cpu": sum(n.current_load.get("cpu", 0) for n in self.nodes.values()),
            "memory": sum(n.current_load.get("memory", 0) for n in self.nodes.values()),
            "storage": sum(n.current_load.get("storage", 0) for n in self.nodes.values())
        }

        return {
            "total_nodes": len(self.nodes),
            "healthy_nodes": len([n for n in self.nodes.values() if n.status == NodeStatus.HEALTHY]),
            "total_workloads": len(self.workloads),
            "active_deployments": len([d for d in self.deployments.values() if d.status == "running"]),
            "capacity": total_capacity,
            "utilization": total_used,
            "nodes_by_location": self._group_nodes_by_location()
        }

    def _group_nodes_by_location(self) -> Dict[str, int]:
        """Group nodes by geographic location"""
        location_counts = {}
        for node in self.nodes.values():
            location_counts[node.location] = location_counts.get(node.location, 0) + 1
        return location_counts
```

### CDN Cache Optimization System

```python
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import time


class CachePolicy(Enum):
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    FIFO = "fifo"  # First In First Out
    ADAPTIVE = "adaptive"  # Adaptive based on patterns


@dataclass
class CachedObject:
    key: str
    content: bytes
    content_type: str
    size_bytes: int
    created_at: datetime
    last_accessed: datetime
    access_count: int = 0
    ttl_seconds: Optional[int] = None
    etag: Optional[str] = None
    metadata: Dict[str, str] = field(default_factory=dict)

    def is_expired(self) -> bool:
        """Check if cache entry is expired"""
        if self.ttl_seconds is None:
            return False

        age = (datetime.now() - self.created_at).seconds
        return age > self.ttl_seconds

    def calculate_score(self, policy: CachePolicy) -> float:
        """Calculate eviction score based on policy"""
        if policy == CachePolicy.LRU:
            # Lower score = evict first
            age = (datetime.now() - self.last_accessed).seconds
            return -age

        elif policy == CachePolicy.LFU:
            return self.access_count

        elif policy == CachePolicy.FIFO:
            age = (datetime.now() - self.created_at).seconds
            return -age

        elif policy == CachePolicy.ADAPTIVE:
            # Weighted score considering recency, frequency, and size
            recency = (datetime.now() - self.last_accessed).seconds
            frequency = self.access_count
            size_penalty = self.size_bytes / (1024 * 1024)  # MB

            score = (frequency * 100) - (recency / 60) - size_penalty
            return score

        return 0


class EdgeCDNCache:
    def __init__(
        self,
        max_size_bytes: int,
        policy: CachePolicy = CachePolicy.ADAPTIVE,
        enable_compression: bool = True
    ):
        self.max_size_bytes = max_size_bytes
        self.policy = policy
        self.enable_compression = enable_compression

        self.cache: Dict[str, CachedObject] = {}
        self.current_size_bytes = 0

        # Statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "bytes_served": 0,
            "objects_cached": 0
        }

    def get(self, key: str) -> Optional[Tuple[bytes, str, Dict[str, str]]]:
        """Retrieve object from cache"""
        cached = self.cache.get(key)

        if cached is None:
            self.stats["misses"] += 1
            return None

        # Check expiration
        if cached.is_expired():
            self._evict(key)
            self.stats["misses"] += 1
            return None

        # Update access metadata
        cached.last_accessed = datetime.now()
        cached.access_count += 1

        self.stats["hits"] += 1
        self.stats["bytes_served"] += cached.size_bytes

        return (cached.content, cached.content_type, cached.metadata)

    def put(
        self,
        key: str,
        content: bytes,
        content_type: str,
        ttl_seconds: Optional[int] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> bool:
        """Add object to cache"""
        size = len(content)

        # Check if object is too large
        if size > self.max_size_bytes:
            return False

        # Generate ETag
        etag = hashlib.md5(content).hexdigest()

        # Evict if necessary
        while self.current_size_bytes + size > self.max_size_bytes:
            if not self._evict_one():
                return False

        # Create cache entry
        cached_obj = CachedObject(
            key=key,
            content=content,
            content_type=content_type,
            size_bytes=size,
            created_at=datetime.now(),
            last_accessed=datetime.now(),
            ttl_seconds=ttl_seconds,
            etag=etag,
            metadata=metadata or {}
        )

        # Remove existing if updating
        if key in self.cache:
            self._evict(key)

        # Add to cache
        self.cache[key] = cached_obj
        self.current_size_bytes += size
        self.stats["objects_cached"] += 1

        return True

    def invalidate(self, key: str) -> bool:
        """Invalidate cache entry"""
        return self._evict(key)

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        keys_to_evict = [
            key for key in self.cache.keys()
            if pattern in key
        ]

        for key in keys_to_evict:
            self._evict(key)

        return len(keys_to_evict)

    def _evict(self, key: str) -> bool:
        """Evict specific cache entry"""
        cached = self.cache.get(key)
        if cached is None:
            return False

        del self.cache[key]
        self.current_size_bytes -= cached.size_bytes
        self.stats["evictions"] += 1

        return True

    def _evict_one(self) -> bool:
        """Evict one entry based on policy"""
        if not self.cache:
            return False

        # Find entry to evict
        evict_key = self._select_eviction_candidate()

        if evict_key:
            return self._evict(evict_key)

        return False

    def _select_eviction_candidate(self) -> Optional[str]:
        """Select cache entry to evict based on policy"""
        if not self.cache:
            return None

        # Calculate scores for all entries
        scored_entries = [
            (obj.calculate_score(self.policy), key)
            for key, obj in self.cache.items()
        ]

        # Sort by score (lowest score gets evicted first)
        scored_entries.sort()

        return scored_entries[0][1] if scored_entries else None

    def get_stats(self) -> Dict[str, any]:
        """Get cache statistics"""
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0

        return {
            **self.stats,
            "hit_rate_percent": hit_rate,
            "current_size_mb": self.current_size_bytes / (1024 * 1024),
            "max_size_mb": self.max_size_bytes / (1024 * 1024),
            "utilization_percent": (self.current_size_bytes / self.max_size_bytes * 100),
            "total_objects": len(self.cache)
        }

    def cleanup_expired(self) -> int:
        """Remove all expired entries"""
        expired_keys = [
            key for key, obj in self.cache.items()
            if obj.is_expired()
        ]

        for key in expired_keys:
            self._evict(key)

        return len(expired_keys)
```

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
