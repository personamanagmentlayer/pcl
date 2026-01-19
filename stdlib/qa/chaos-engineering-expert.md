---
description: Expert in chaos engineering principles, failure injection, resilience testing, Chaos Monkey, Gremlin, and building fault-tolerant systems
keywords: [chaos-engineering, failure-injection, resilience-testing, chaos-monkey, gremlin, fault-tolerance, site-reliability]
category: qa
expertise_level: expert
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

## Implementation Examples

### Chaos Toolkit Experiment

```yaml
# chaos-experiment.yaml
version: 1.0.0
title: Service Resilience Under Load
description: Test service behavior when database becomes unavailable

configuration:
    service_url: https://api.example.com
    health_endpoint: /health

steady-state-hypothesis:
    title: Service is healthy and responsive
    probes:
        - name: service-is-available
          type: probe
          provider:
              type: http
              url: ${service_url}${health_endpoint}
              timeout: 5
          tolerance: 200

        - name: response-time-acceptable
          type: probe
          provider:
              type: http
              url: ${service_url}/api/users
              timeout: 2
          tolerance:
              type: probe
              status: 200

method:
    - type: action
      name: introduce-database-latency
      provider:
          type: python
          module: chaosaws.rds.actions
          func: inject_db_latency
          arguments:
              db_identifier: production-db
              latency_ms: 2000
              duration: 60

    - type: probe
      name: check-error-rate
      provider:
          type: http
          url: ${service_url}/metrics
      tolerance:
          type: jsonpath
          path: $.error_rate
          expect: less_than(0.05)

    - type: action
      name: terminate-random-instance
      provider:
          type: python
          module: chaosaws.ec2.actions
          func: terminate_instances
          arguments:
              filters: [{"Name": "tag:Service", "Values": ["api"]}]
              az: us-east-1a

    - type: pause
      duration: 30

rollbacks:
    - type: action
      name: restore-database-performance
      provider:
          type: python
          module: chaosaws.rds.actions
          func: remove_db_latency
          arguments:
              db_identifier: production-db
```

### Gremlin Attack Scenarios

```bash
#!/bin/bash
# Gremlin CLI attack examples

# Network latency attack
gremlin attack-network latency create \
    --delay 1000 \
    --length 300 \
    --target "tags.service=api" \
    --container-ids $(docker ps -q)

# CPU resource exhaustion
gremlin attack-resource cpu create \
    --percent 80 \
    --length 300 \
    --target "tags.environment=production"

# Memory exhaustion
gremlin attack-resource memory create \
    --gibibytes 2 \
    --length 180 \
    --target "tags.service=worker"

# Disk fill attack
gremlin attack-resource disk create \
    --dir /var/log \
    --percent 90 \
    --length 300

# Process killer (Chaos Monkey)
gremlin attack-state process-killer create \
    --process nginx \
    --interval 60 \
    --length 600

# Network packet loss
gremlin attack-network packet-loss create \
    --percent 20 \
    --length 300 \
    --target "tags.tier=frontend"

# Network blackhole (partition)
gremlin attack-network blackhole create \
    --ingress \
    --egress \
    --port 5432 \
    --length 120

# Time travel (clock skew)
gremlin attack-state time-travel create \
    --offset -3600000 \
    --length 300

# DNS attack
gremlin attack-network dns create \
    --protocol UDP \
    --port 53 \
    --length 300
```

### Custom Chaos Tool (Python)

```python
# chaos_injector.py
import random
import time
import requests
import psutil
import subprocess
from typing import List, Dict
from datetime import datetime

class ChaosInjector:
    def __init__(self, target_service: str, log_file: str = "chaos.log"):
        self.target = target_service
        self.log_file = log_file
        self.active_attacks = []

    def log_event(self, event: str):
        """Log chaos event with timestamp"""
        timestamp = datetime.now().isoformat()
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {event}\n")
        print(f"[{timestamp}] {event}")

    def verify_steady_state(self) -> bool:
        """Check if system is in steady state"""
        try:
            response = requests.get(f"{self.target}/health", timeout=5)
            if response.status_code == 200:
                metrics = response.json()
                return (
                    metrics.get('error_rate', 1.0) < 0.01 and
                    metrics.get('response_time_p95', 1000) < 500
                )
        except Exception as e:
            self.log_event(f"Steady state check failed: {e}")
            return False

    def inject_network_latency(self, delay_ms: int, duration: int):
        """Inject network latency using tc (Linux)"""
        self.log_event(f"Injecting {delay_ms}ms network latency for {duration}s")

        try:
            # Add latency
            subprocess.run([
                'tc', 'qdisc', 'add', 'dev', 'eth0', 'root', 'netem',
                'delay', f'{delay_ms}ms'
            ], check=True)

            time.sleep(duration)

            # Remove latency
            subprocess.run([
                'tc', 'qdisc', 'del', 'dev', 'eth0', 'root'
            ], check=True)

            self.log_event("Network latency removed")

        except subprocess.CalledProcessError as e:
            self.log_event(f"Failed to inject network latency: {e}")

    def inject_cpu_stress(self, cpu_percent: int, duration: int):
        """Inject CPU stress"""
        self.log_event(f"Injecting {cpu_percent}% CPU stress for {duration}s")

        import multiprocessing

        def stress_cpu():
            end_time = time.time() + duration
            while time.time() < end_time:
                # Busy loop to consume CPU
                for _ in range(1000000):
                    pass

        # Calculate number of processes
        num_cores = multiprocessing.cpu_count()
        num_processes = int(num_cores * cpu_percent / 100)

        processes = []
        for _ in range(num_processes):
            p = multiprocessing.Process(target=stress_cpu)
            p.start()
            processes.append(p)

        for p in processes:
            p.join()

        self.log_event("CPU stress removed")

    def inject_memory_pressure(self, mb: int, duration: int):
        """Inject memory pressure"""
        self.log_event(f"Allocating {mb}MB memory for {duration}s")

        try:
            # Allocate memory
            memory_hog = bytearray(mb * 1024 * 1024)
            time.sleep(duration)
            del memory_hog

            self.log_event("Memory released")

        except MemoryError:
            self.log_event("Failed to allocate memory")

    def kill_random_process(self, process_name: str):
        """Kill a random instance of a process"""
        self.log_event(f"Killing random '{process_name}' process")

        matching_procs = []
        for proc in psutil.process_iter(['pid', 'name']):
            if process_name in proc.info['name']:
                matching_procs.append(proc)

        if matching_procs:
            target = random.choice(matching_procs)
            try:
                target.kill()
                self.log_event(f"Killed process {target.pid}")
            except psutil.NoSuchProcess:
                self.log_event(f"Process {target.pid} already terminated")
        else:
            self.log_event(f"No matching processes found for '{process_name}'")

    def inject_packet_loss(self, loss_percent: int, duration: int):
        """Inject packet loss"""
        self.log_event(f"Injecting {loss_percent}% packet loss for {duration}s")

        try:
            subprocess.run([
                'tc', 'qdisc', 'add', 'dev', 'eth0', 'root', 'netem',
                'loss', f'{loss_percent}%'
            ], check=True)

            time.sleep(duration)

            subprocess.run([
                'tc', 'qdisc', 'del', 'dev', 'eth0', 'root'
            ], check=True)

            self.log_event("Packet loss removed")

        except subprocess.CalledProcessError as e:
            self.log_event(f"Failed to inject packet loss: {e}")

    def run_experiment(self, attack_type: str, **kwargs):
        """Run a chaos experiment"""
        self.log_event(f"Starting chaos experiment: {attack_type}")

        # Verify steady state
        if not self.verify_steady_state():
            self.log_event("System not in steady state, aborting experiment")
            return False

        # Execute attack
        attack_map = {
            'network_latency': self.inject_network_latency,
            'cpu_stress': self.inject_cpu_stress,
            'memory_pressure': self.inject_memory_pressure,
            'packet_loss': self.inject_packet_loss,
            'process_kill': self.kill_random_process
        }

        if attack_type in attack_map:
            try:
                attack_map[attack_type](**kwargs)
            except Exception as e:
                self.log_event(f"Attack failed: {e}")
                return False

        # Verify recovery
        time.sleep(10)  # Grace period
        recovered = self.verify_steady_state()

        if recovered:
            self.log_event("System recovered to steady state")
        else:
            self.log_event("WARNING: System did not recover!")

        return recovered

# Usage
if __name__ == "__main__":
    chaos = ChaosInjector("http://localhost:8080")

    # Run experiments
    chaos.run_experiment('network_latency', delay_ms=1000, duration=60)
    chaos.run_experiment('cpu_stress', cpu_percent=80, duration=120)
    chaos.run_experiment('packet_loss', loss_percent=10, duration=60)
```

### Kubernetes Chaos with Litmus

```yaml
# litmus-chaos-experiment.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: nginx-chaos
  namespace: default
spec:
  appinfo:
    appns: 'default'
    applabel: 'app=nginx'
    appkind: 'deployment'
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '60'
            - name: CHAOS_INTERVAL
              value: '10'
            - name: FORCE
              value: 'false'

    - name: container-kill
      spec:
        components:
          env:
            - name: TARGET_CONTAINER
              value: 'nginx'
            - name: CHAOS_DURATION
              value: '60'

    - name: pod-network-latency
      spec:
        components:
          env:
            - name: NETWORK_LATENCY
              value: '2000'
            - name: TOTAL_CHAOS_DURATION
              value: '60'
```

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
