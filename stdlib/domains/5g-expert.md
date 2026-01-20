# 5G Expert

---

skill_id: 5g-expert
name: 5G Expert
allowed-tools:

- Read
- Write
- Bash
- WebSearch
  category: domains
  tags: [5g, network-slicing, mec, edge-computing, nfv, sdn, iot, urllc, embb, mmtc]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master 5G network architecture and components
- Implement network slicing for service differentiation
- Deploy Multi-access Edge Computing (MEC) applications
- Optimize for ultra-low latency use cases (URLLC)
- Integrate IoT devices with 5G networks
  prerequisites:
- Strong understanding of networking protocols
- Knowledge of SDN and NFV concepts
- Familiarity with cloud-native architectures
- Understanding of wireless communication principles
  outcome: Design and deploy production-ready 5G network solutions including network slicing, edge computing, and ultra-low latency applications

---

## Core Concepts

### 5G Network Architecture

Next-generation mobile network with service-based architecture (SBA), network functions virtualization (NFV), and software-defined networking (SDN). Supports enhanced mobile broadband (eMBB), ultra-reliable low-latency communication (URLLC), and massive machine-type communication (mMTC).

### Network Slicing

Logical end-to-end networks running on shared physical infrastructure. Each slice optimized for specific service requirements (latency, bandwidth, reliability) enabling customized connectivity for diverse use cases.

### Multi-Access Edge Computing (MEC)

Computing resources deployed at network edge near 5G base stations. Enables ultra-low latency applications by processing data locally instead of routing to distant cloud data centers.

### Ultra-Reliable Low-Latency Communication (URLLC)

5G service category targeting <1ms latency and 99.999% reliability. Critical for industrial automation, autonomous vehicles, remote surgery, and real-time control systems.

### Massive IoT (mMTC)

Support for millions of connected devices per square kilometer with optimized power consumption. Enables smart cities, agriculture, environmental monitoring, and industrial IoT applications.

## Code Examples

### 5G Network Slice Manager

```python
"""
5G Network Slice Lifecycle Management System
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import uuid
import asyncio
import json


class SliceType(Enum):
    EMBB = "enhanced_mobile_broadband"  # High bandwidth
    URLLC = "ultra_reliable_low_latency"  # Low latency, high reliability
    MMTC = "massive_machine_type"  # Many devices, low power


class SliceStatus(Enum):
    PENDING = "pending"
    INSTANTIATING = "instantiating"
    ACTIVE = "active"
    MODIFYING = "modifying"
    TERMINATING = "terminating"
    TERMINATED = "terminated"
    FAILED = "failed"


@dataclass
class QoSRequirements:
    max_latency_ms: int
    min_bandwidth_mbps: int
    reliability_percent: float
    max_packet_loss_percent: float
    priority: int  # 1-10, higher = more important


@dataclass
class NetworkSliceTemplate:
    slice_type: SliceType
    name: str
    description: str
    qos_requirements: QoSRequirements
    vnf_requirements: List[str]  # Virtual Network Functions
    coverage_area: List[str]  # Geographic areas
    capacity: Dict[str, int]  # Max users, devices, etc.


@dataclass
class NetworkSliceInstance:
    slice_id: str
    template: NetworkSliceTemplate
    status: SliceStatus
    created_at: datetime
    tenant_id: str
    allocated_resources: Dict[str, any] = field(default_factory=dict)
    active_connections: int = 0
    metrics: Dict[str, float] = field(default_factory=dict)
    sla_violations: List[Dict] = field(default_factory=list)


@dataclass
class NetworkFunction:
    nf_id: str
    nf_type: str  # AMF, SMF, UPF, etc.
    status: str
    endpoint: str
    allocated_resources: Dict[str, float]


class NetworkSliceManager:
    def __init__(self):
        self.slices: Dict[str, NetworkSliceInstance] = {}
        self.templates: Dict[str, NetworkSliceTemplate] = {}
        self.network_functions: Dict[str, NetworkFunction] = {}

        # Resource pool
        self.total_bandwidth = 10000  # Mbps
        self.total_compute = 1000  # vCPUs
        self.total_memory = 2000  # GB

        self.allocated_bandwidth = 0
        self.allocated_compute = 0
        self.allocated_memory = 0

        # Initialize default templates
        self._initialize_templates()

    def _initialize_templates(self):
        """Initialize standard network slice templates"""

        # eMBB slice for high-bandwidth applications
        self.templates['embb_standard'] = NetworkSliceTemplate(
            slice_type=SliceType.EMBB,
            name="eMBB Standard",
            description="High bandwidth for mobile broadband",
            qos_requirements=QoSRequirements(
                max_latency_ms=50,
                min_bandwidth_mbps=100,
                reliability_percent=99.9,
                max_packet_loss_percent=0.1,
                priority=5
            ),
            vnf_requirements=['AMF', 'SMF', 'UPF', 'UDM'],
            coverage_area=['urban'],
            capacity={'max_users': 10000, 'max_devices': 50000}
        )

        # URLLC slice for ultra-low latency
        self.templates['urllc_critical'] = NetworkSliceTemplate(
            slice_type=SliceType.URLLC,
            name="URLLC Critical",
            description="Ultra-low latency for mission-critical applications",
            qos_requirements=QoSRequirements(
                max_latency_ms=1,
                min_bandwidth_mbps=50,
                reliability_percent=99.999,
                max_packet_loss_percent=0.001,
                priority=10
            ),
            vnf_requirements=['AMF', 'SMF', 'UPF', 'UDM', 'MEC'],
            coverage_area=['industrial', 'urban'],
            capacity={'max_users': 1000, 'max_devices': 5000}
        )

        # mMTC slice for massive IoT
        self.templates['mmtc_iot'] = NetworkSliceTemplate(
            slice_type=SliceType.MMTC,
            name="mMTC IoT",
            description="Massive IoT device connectivity",
            qos_requirements=QoSRequirements(
                max_latency_ms=1000,
                min_bandwidth_mbps=1,
                reliability_percent=99.0,
                max_packet_loss_percent=1.0,
                priority=3
            ),
            vnf_requirements=['AMF', 'SMF', 'UPF', 'UDM'],
            coverage_area=['urban', 'rural', 'industrial'],
            capacity={'max_users': 100, 'max_devices': 1000000}
        )

    async def create_slice(
        self,
        template_name: str,
        tenant_id: str,
        custom_params: Optional[Dict] = None
    ) -> NetworkSliceInstance:
        """Create and instantiate a new network slice"""

        template = self.templates.get(template_name)
        if not template:
            raise ValueError(f"Template not found: {template_name}")

        # Generate slice ID
        slice_id = str(uuid.uuid4())

        # Check resource availability
        required_bandwidth = template.qos_requirements.min_bandwidth_mbps
        required_compute = self._estimate_compute_requirements(template)
        required_memory = self._estimate_memory_requirements(template)

        if not self._check_resources(required_bandwidth, required_compute, required_memory):
            raise RuntimeError("Insufficient resources for slice instantiation")

        # Create slice instance
        slice_instance = NetworkSliceInstance(
            slice_id=slice_id,
            template=template,
            status=SliceStatus.INSTANTIATING,
            created_at=datetime.now(),
            tenant_id=tenant_id
        )

        self.slices[slice_id] = slice_instance

        # Instantiate network functions
        await self._instantiate_vnfs(slice_instance)

        # Allocate resources
        self._allocate_resources(
            slice_instance,
            required_bandwidth,
            required_compute,
            required_memory
        )

        # Configure network
        await self._configure_network(slice_instance)

        # Activate slice
        slice_instance.status = SliceStatus.ACTIVE

        print(f"Network slice created: {slice_id} ({template.name})")

        return slice_instance

    async def _instantiate_vnfs(self, slice_instance: NetworkSliceInstance):
        """Instantiate required virtual network functions"""

        for vnf_type in slice_instance.template.vnf_requirements:
            nf_id = f"{slice_instance.slice_id}-{vnf_type}"

            # Simulate VNF instantiation
            await asyncio.sleep(0.1)

            network_function = NetworkFunction(
                nf_id=nf_id,
                nf_type=vnf_type,
                status="active",
                endpoint=f"http://nf-{nf_id}:8080",
                allocated_resources={
                    'cpu': 4,
                    'memory': 8,
                    'storage': 20
                }
            )

            self.network_functions[nf_id] = network_function

            print(f"Instantiated {vnf_type} for slice {slice_instance.slice_id}")

    def _allocate_resources(
        self,
        slice_instance: NetworkSliceInstance,
        bandwidth: int,
        compute: int,
        memory: int
    ):
        """Allocate network and compute resources to slice"""

        self.allocated_bandwidth += bandwidth
        self.allocated_compute += compute
        self.allocated_memory += memory

        slice_instance.allocated_resources = {
            'bandwidth_mbps': bandwidth,
            'compute_vcpu': compute,
            'memory_gb': memory
        }

    async def _configure_network(self, slice_instance: NetworkSliceInstance):
        """Configure network paths and QoS policies"""

        # Configure SDN controllers
        await self._configure_sdn_rules(slice_instance)

        # Set up QoS policies
        await self._apply_qos_policies(slice_instance)

        # Configure routing
        await self._configure_routing(slice_instance)

    async def _configure_sdn_rules(self, slice_instance: NetworkSliceInstance):
        """Configure SDN flow rules for slice"""
        # Simulate SDN configuration
        await asyncio.sleep(0.05)

        qos = slice_instance.template.qos_requirements

        rules = {
            'slice_id': slice_instance.slice_id,
            'priority': qos.priority,
            'max_latency': qos.max_latency_ms,
            'min_bandwidth': qos.min_bandwidth_mbps,
            'packet_marking': f"DSCP-{qos.priority * 6}"
        }

        print(f"SDN rules configured: {rules}")

    async def _apply_qos_policies(self, slice_instance: NetworkSliceInstance):
        """Apply QoS policies to slice traffic"""
        await asyncio.sleep(0.05)

        qos = slice_instance.template.qos_requirements

        policies = {
            'traffic_shaping': {
                'max_rate': qos.min_bandwidth_mbps * 1.2,
                'guaranteed_rate': qos.min_bandwidth_mbps
            },
            'queue_priority': qos.priority,
            'drop_policy': 'tail_drop' if qos.max_packet_loss_percent > 0.1 else 'none'
        }

        print(f"QoS policies applied: {policies}")

    async def _configure_routing(self, slice_instance: NetworkSliceInstance):
        """Configure routing for slice"""
        await asyncio.sleep(0.05)

        # For URLLC, use edge routing; for others, standard routing
        if slice_instance.template.slice_type == SliceType.URLLC:
            routing_mode = "edge_local"
        else:
            routing_mode = "standard"

        print(f"Routing configured: {routing_mode}")

    async def terminate_slice(self, slice_id: str):
        """Terminate and cleanup network slice"""

        slice_instance = self.slices.get(slice_id)
        if not slice_instance:
            raise ValueError(f"Slice not found: {slice_id}")

        slice_instance.status = SliceStatus.TERMINATING

        # Release network functions
        for vnf_type in slice_instance.template.vnf_requirements:
            nf_id = f"{slice_id}-{vnf_type}"
            if nf_id in self.network_functions:
                del self.network_functions[nf_id]

        # Release resources
        resources = slice_instance.allocated_resources
        self.allocated_bandwidth -= resources.get('bandwidth_mbps', 0)
        self.allocated_compute -= resources.get('compute_vcpu', 0)
        self.allocated_memory -= resources.get('memory_gb', 0)

        slice_instance.status = SliceStatus.TERMINATED

        print(f"Network slice terminated: {slice_id}")

    def monitor_slice(self, slice_id: str) -> Dict:
        """Monitor slice performance and SLA compliance"""

        slice_instance = self.slices.get(slice_id)
        if not slice_instance:
            raise ValueError(f"Slice not found: {slice_id}")

        # Simulate metrics collection
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'slice_id': slice_id,
            'status': slice_instance.status.value,
            'active_connections': slice_instance.active_connections,
            'latency_ms': self._measure_latency(slice_instance),
            'throughput_mbps': self._measure_throughput(slice_instance),
            'packet_loss_percent': self._measure_packet_loss(slice_instance),
            'resource_utilization': {
                'bandwidth': slice_instance.allocated_resources.get('bandwidth_mbps', 0),
                'compute': slice_instance.allocated_resources.get('compute_vcpu', 0),
                'memory': slice_instance.allocated_resources.get('memory_gb', 0)
            }
        }

        # Check SLA compliance
        qos = slice_instance.template.qos_requirements

        if metrics['latency_ms'] > qos.max_latency_ms:
            self._record_sla_violation(slice_instance, 'latency', metrics['latency_ms'])

        if metrics['packet_loss_percent'] > qos.max_packet_loss_percent:
            self._record_sla_violation(slice_instance, 'packet_loss', metrics['packet_loss_percent'])

        slice_instance.metrics = metrics

        return metrics

    def _measure_latency(self, slice_instance: NetworkSliceInstance) -> float:
        """Measure current latency"""
        # Simulate measurement based on slice type
        if slice_instance.template.slice_type == SliceType.URLLC:
            return 0.5 + (0.5 * (slice_instance.active_connections / 100))
        elif slice_instance.template.slice_type == SliceType.EMBB:
            return 20 + (10 * (slice_instance.active_connections / 1000))
        else:  # mMTC
            return 500 + (200 * (slice_instance.active_connections / 10000))

    def _measure_throughput(self, slice_instance: NetworkSliceInstance) -> float:
        """Measure current throughput"""
        allocated = slice_instance.allocated_resources.get('bandwidth_mbps', 0)
        utilization = min(1.0, slice_instance.active_connections / 100)
        return allocated * utilization

    def _measure_packet_loss(self, slice_instance: NetworkSliceInstance) -> float:
        """Measure packet loss percentage"""
        # Better performance for higher priority slices
        base_loss = 0.001 * (11 - slice_instance.template.qos_requirements.priority)
        load_factor = slice_instance.active_connections / 1000
        return base_loss * (1 + load_factor)

    def _record_sla_violation(self, slice_instance: NetworkSliceInstance, metric: str, value: float):
        """Record SLA violation"""
        violation = {
            'timestamp': datetime.now().isoformat(),
            'metric': metric,
            'value': value,
            'threshold': getattr(slice_instance.template.qos_requirements, f"max_{metric}_ms" if metric == 'latency' else f"max_{metric}_percent")
        }
        slice_instance.sla_violations.append(violation)
        print(f"SLA violation: {slice_id} - {metric} = {value}")

    def _check_resources(self, bandwidth: int, compute: int, memory: int) -> bool:
        """Check if sufficient resources available"""
        return (
            self.allocated_bandwidth + bandwidth <= self.total_bandwidth and
            self.allocated_compute + compute <= self.total_compute and
            self.allocated_memory + memory <= self.total_memory
        )

    def _estimate_compute_requirements(self, template: NetworkSliceTemplate) -> int:
        """Estimate compute requirements for slice"""
        # Base requirements per VNF type
        base_per_vnf = 8  # vCPUs

        # Additional for URLLC and MEC
        if template.slice_type == SliceType.URLLC:
            base_per_vnf *= 1.5

        return int(len(template.vnf_requirements) * base_per_vnf)

    def _estimate_memory_requirements(self, template: NetworkSliceTemplate) -> int:
        """Estimate memory requirements for slice"""
        base_per_vnf = 16  # GB

        if template.slice_type == SliceType.URLLC:
            base_per_vnf *= 1.5

        return int(len(template.vnf_requirements) * base_per_vnf)

    def get_resource_overview(self) -> Dict:
        """Get overview of resource allocation"""
        return {
            'bandwidth': {
                'total': self.total_bandwidth,
                'allocated': self.allocated_bandwidth,
                'available': self.total_bandwidth - self.allocated_bandwidth,
                'utilization_percent': (self.allocated_bandwidth / self.total_bandwidth) * 100
            },
            'compute': {
                'total': self.total_compute,
                'allocated': self.allocated_compute,
                'available': self.total_compute - self.allocated_compute,
                'utilization_percent': (self.allocated_compute / self.total_compute) * 100
            },
            'memory': {
                'total': self.total_memory,
                'allocated': self.allocated_memory,
                'available': self.total_memory - self.allocated_memory,
                'utilization_percent': (self.allocated_memory / self.total_memory) * 100
            },
            'active_slices': len([s for s in self.slices.values() if s.status == SliceStatus.ACTIVE])
        }


# Example usage
async def demo_network_slicing():
    """Demonstrate 5G network slicing"""

    manager = NetworkSliceManager()

    # Create eMBB slice for mobile broadband
    embb_slice = await manager.create_slice('embb_standard', tenant_id='tenant_001')
    print(f"Created eMBB slice: {embb_slice.slice_id}")

    # Create URLLC slice for industrial automation
    urllc_slice = await manager.create_slice('urllc_critical', tenant_id='tenant_002')
    print(f"Created URLLC slice: {urllc_slice.slice_id}")

    # Create mMTC slice for IoT
    mmtc_slice = await manager.create_slice('mmtc_iot', tenant_id='tenant_003')
    print(f"Created mMTC slice: {mmtc_slice.slice_id}")

    # Simulate connections
    embb_slice.active_connections = 500
    urllc_slice.active_connections = 50
    mmtc_slice.active_connections = 10000

    # Monitor slices
    for slice_id in [embb_slice.slice_id, urllc_slice.slice_id, mmtc_slice.slice_id]:
        metrics = manager.monitor_slice(slice_id)
        print(f"\nMetrics for {slice_id}:")
        print(json.dumps(metrics, indent=2))

    # Resource overview
    resources = manager.get_resource_overview()
    print(f"\nResource Overview:")
    print(json.dumps(resources, indent=2))

    # Cleanup
    await manager.terminate_slice(embb_slice.slice_id)


if __name__ == '__main__':
    asyncio.run(demo_network_slicing())
```

### MEC Application Framework

```python
"""
Multi-Access Edge Computing Application Framework
"""

from typing import Dict, List, Callable, Any
import asyncio
from dataclasses import dataclass
from datetime import datetime


@dataclass
class MECApplication:
    app_id: str
    name: str
    compute_requirements: Dict[str, float]
    latency_requirement_ms: float
    callback: Callable


class MECPlatform:
    def __init__(self, edge_location: str):
        self.edge_location = edge_location
        self.applications: Dict[str, MECApplication] = {}
        self.device_connections: Dict[str, Dict] = {}

    async def register_application(self, app: MECApplication):
        """Register MEC application"""
        self.applications[app.app_id] = app
        print(f"MEC app registered: {app.name} at {self.edge_location}")

    async def process_request(
        self,
        device_id: str,
        app_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process device request at edge"""

        start_time = datetime.now()

        # Get application
        app = self.applications.get(app_id)
        if not app:
            raise ValueError(f"Application not found: {app_id}")

        # Process at edge (low latency)
        result = await app.callback(data)

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        return {
            'result': result,
            'processing_time_ms': processing_time,
            'processed_at': 'edge',
            'edge_location': self.edge_location
        }


# Example MEC application: AR/VR rendering
async def ar_rendering_callback(data: Dict) -> Dict:
    """Process AR rendering at edge"""
    await asyncio.sleep(0.002)  # 2ms processing

    return {
        'rendered_frame': 'base64_encoded_image',
        'pose_correction': {'x': 0.1, 'y': -0.2, 'z': 0.0}
    }
```

## Best Practices

### Network Slicing Design

- Define clear service level agreements (SLAs) for each slice
- Implement resource isolation between slices
- Use dynamic resource allocation based on demand
- Monitor slice performance continuously
- Implement automated scaling and healing
- Design for multi-tenancy security
- Plan for slice lifecycle management

### MEC Application Development

- Minimize edge-to-cloud round trips
- Implement intelligent workload placement
- Use stateless designs when possible
- Cache frequently accessed data at edge
- Handle intermittent connectivity
- Implement data synchronization strategies
- Monitor edge resource utilization

### URLLC Optimization

- Use dedicated URLLC network slices
- Implement deterministic networking
- Minimize protocol overhead
- Use edge processing for time-critical tasks
- Implement redundancy for reliability
- Monitor end-to-end latency continuously
- Test failure scenarios extensively

### IoT Integration

- Use NB-IoT or LTE-M for low-power devices
- Implement efficient data aggregation
- Use appropriate QoS for device classes
- Implement device management at scale
- Handle firmware updates efficiently
- Monitor device health and connectivity
- Design for battery-constrained devices

## Anti-Patterns

### Common Mistakes

- Over-provisioning slices leading to waste
- Not implementing proper slice isolation
- Ignoring latency requirements in design
- Hardcoding network configurations
- Not handling slice failures gracefully
- Inadequate security between slices
- Not monitoring SLA compliance

### Design Issues

- Centralized processing for latency-sensitive apps
- Not leveraging edge computing capabilities
- Monolithic network functions
- Inadequate capacity planning
- Not considering mobility handoffs
- Poor resource allocation algorithms
- Missing automated orchestration

## Resources

### 5G Platforms & Tools

- Open5GS - Open source 5G core
- free5GC - Open source 5G core
- OpenAirInterface - 5G RAN software
- ONAP - Network automation platform
- OSM - NFV orchestrator
- Kubernetes - Container orchestration

### Standards & Specifications

- 3GPP specifications
- ETSI NFV standards
- ETSI MEC specifications
- O-RAN Alliance specs
- IETF networking RFCs
- ITU-T recommendations

### Hardware & Infrastructure

- Ericsson 5G equipment
- Nokia 5G solutions
- Huawei 5G infrastructure
- Samsung 5G networks
- Qualcomm 5G chips
- Intel FlexRAN

### Learning Resources

- 5G Academy
- 3GPP official documentation
- Ericsson Technology Review
- Nokia Bell Labs Technical Journal
- IEEE Communications Magazine
- 5G Spectrum and Standards book

---

_Part of the PCL Standard Library - Build next-generation applications on 5G networks with ultra-low latency and massive connectivity._
