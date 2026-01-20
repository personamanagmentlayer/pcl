# Cybersecurity Expert

---

skill_id: cybersecurity-expert
name: Cybersecurity Expert
allowed-tools:

- Read
- Write
- Bash
- Grep
- Glob
- WebSearch
  category: domains
  tags: [security, cybersecurity, threat-detection, incident-response, vulnerability, siem, compliance, infosec]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master security information and event management (SIEM)
- Understand threat detection and incident response
- Implement vulnerability management programs
- Apply security compliance frameworks
- Navigate security operations center (SOC) workflows
  prerequisites:
- Understanding of network security fundamentals
- Knowledge of security frameworks and standards
- Familiarity with common attack vectors
- Experience with security tools and technologies
  outcome: Build comprehensive cybersecurity solutions including threat detection, incident response, vulnerability management, and security compliance monitoring

---

## Core Concepts

### Security Information & Event Management (SIEM)

Centralized platforms that aggregate, analyze, and correlate security logs and events from across infrastructure to detect threats, investigate incidents, and maintain compliance.

### Threat Detection & Intelligence

Proactive identification of security threats using behavioral analysis, indicators of compromise (IOCs), threat feeds, and machine learning to detect anomalies and potential attacks.

### Incident Response

Structured approach to handling security breaches and cyberattacks including preparation, detection, containment, eradication, recovery, and post-incident analysis.

### Vulnerability Management

Systematic identification, classification, prioritization, remediation, and mitigation of security vulnerabilities in systems, applications, and infrastructure.

### Security Compliance

Ensuring organizational adherence to security standards and regulations like GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001 through controls, audits, and documentation.

## Code Examples

### SIEM Event Processing System

```python
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any, Set
from dataclasses import dataclass, field
from collections import defaultdict
import hashlib
import uuid

class SeverityLevel(Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class EventCategory(Enum):
    AUTHENTICATION = "authentication"
    NETWORK = "network"
    MALWARE = "malware"
    DATA_ACCESS = "data_access"
    CONFIGURATION = "configuration"
    POLICY_VIOLATION = "policy_violation"

@dataclass
class SecurityEvent:
    event_id: str
    timestamp: datetime
    source_ip: str
    destination_ip: Optional[str]
    user: Optional[str]
    event_type: str
    category: EventCategory
    severity: SeverityLevel
    description: str
    raw_log: str
    device_type: str  # firewall, ids, endpoint, application
    metadata: Dict[str, Any] = field(default_factory=dict)

    def calculate_hash(self) -> str:
        """Calculate event hash for deduplication"""
        hash_input = f"{self.source_ip}{self.event_type}{self.user or ''}"
        return hashlib.md5(hash_input.encode()).hexdigest()

@dataclass
class SecurityAlert:
    alert_id: str
    title: str
    severity: SeverityLevel
    category: EventCategory
    created_at: datetime
    events: List[SecurityEvent]
    indicators: List[str]  # IOCs
    status: str = "new"  # new, investigating, contained, resolved, false_positive
    assigned_to: Optional[str] = None
    notes: List[Dict] = field(default_factory=list)

    def add_note(self, author: str, content: str):
        self.notes.append({
            'timestamp': datetime.now(),
            'author': author,
            'content': content
        })

@dataclass
class ThreatIndicator:
    indicator_id: str
    ioc_type: str  # ip, domain, hash, url, email
    value: str
    threat_type: str  # malware, phishing, c2, etc.
    confidence: int  # 0-100
    source: str
    first_seen: datetime
    last_seen: datetime
    tags: List[str] = field(default_factory=list)

class SIEMPlatform:
    def __init__(self):
        self.events: List[SecurityEvent] = []
        self.alerts: Dict[str, SecurityAlert] = {}
        self.threat_indicators: Dict[str, ThreatIndicator] = {}
        self.correlation_rules: List[Dict] = []
        self.event_dedup_cache: Dict[str, datetime] = {}

        # Initialize default correlation rules
        self._initialize_correlation_rules()

    def _initialize_correlation_rules(self):
        """Initialize threat detection correlation rules"""
        self.correlation_rules = [
            {
                'rule_id': 'failed_login_brute_force',
                'name': 'Failed Login Brute Force',
                'description': 'Multiple failed login attempts',
                'condition': self._detect_brute_force,
                'threshold': 5,
                'timewindow': 300,  # 5 minutes
                'severity': SeverityLevel.HIGH
            },
            {
                'rule_id': 'data_exfiltration',
                'name': 'Potential Data Exfiltration',
                'description': 'Unusual large data transfer',
                'condition': self._detect_data_exfiltration,
                'threshold': 1000000000,  # 1GB
                'timewindow': 3600,
                'severity': SeverityLevel.CRITICAL
            },
            {
                'rule_id': 'lateral_movement',
                'name': 'Lateral Movement Detected',
                'description': 'Multiple internal connections from single source',
                'condition': self._detect_lateral_movement,
                'threshold': 10,
                'timewindow': 600,
                'severity': SeverityLevel.HIGH
            }
        ]

    def ingest_event(self, event_data: Dict[str, Any]) -> Optional[SecurityEvent]:
        """Ingest and process security event"""
        event = SecurityEvent(
            event_id=event_data.get('event_id', str(uuid.uuid4())),
            timestamp=event_data.get('timestamp', datetime.now()),
            source_ip=event_data['source_ip'],
            destination_ip=event_data.get('destination_ip'),
            user=event_data.get('user'),
            event_type=event_data['event_type'],
            category=EventCategory(event_data['category']),
            severity=SeverityLevel(event_data.get('severity', 'info')),
            description=event_data['description'],
            raw_log=event_data['raw_log'],
            device_type=event_data['device_type'],
            metadata=event_data.get('metadata', {})
        )

        # Deduplication
        event_hash = event.calculate_hash()
        if event_hash in self.event_dedup_cache:
            last_seen = self.event_dedup_cache[event_hash]
            if (event.timestamp - last_seen).seconds < 60:
                return None

        self.event_dedup_cache[event_hash] = event.timestamp
        self.events.append(event)

        # Check against threat indicators
        self._check_threat_indicators(event)

        # Run correlation rules
        self._run_correlation_rules(event)

        return event

    def _check_threat_indicators(self, event: SecurityEvent):
        """Check event against known threat indicators"""
        # Check source IP
        if event.source_ip in self.threat_indicators:
            indicator = self.threat_indicators[event.source_ip]
            self._create_alert(
                f"Known Threat Detected: {indicator.threat_type}",
                SeverityLevel.CRITICAL,
                EventCategory.MALWARE,
                [event],
                [indicator.value]
            )

        # Check destination IP
        if event.destination_ip and event.destination_ip in self.threat_indicators:
            indicator = self.threat_indicators[event.destination_ip]
            self._create_alert(
                f"Communication with Known Threat: {indicator.threat_type}",
                SeverityLevel.HIGH,
                EventCategory.NETWORK,
                [event],
                [indicator.value]
            )

    def _run_correlation_rules(self, event: SecurityEvent):
        """Execute correlation rules to detect complex threats"""
        for rule in self.correlation_rules:
            if rule['condition'](event, rule):
                # Rule triggered, create alert
                pass  # Handled within condition functions

    def _detect_brute_force(self, event: SecurityEvent, rule: Dict) -> bool:
        """Detect brute force attacks"""
        if event.event_type != "failed_login":
            return False

        # Get recent failed login events from same source
        timewindow = timedelta(seconds=rule['timewindow'])
        cutoff = event.timestamp - timewindow

        recent_failures = [e for e in self.events
                          if e.source_ip == event.source_ip and
                          e.event_type == "failed_login" and
                          e.timestamp >= cutoff]

        if len(recent_failures) >= rule['threshold']:
            self._create_alert(
                rule['name'],
                rule['severity'],
                EventCategory.AUTHENTICATION,
                recent_failures,
                [event.source_ip]
            )
            return True

        return False

    def _detect_data_exfiltration(self, event: SecurityEvent, rule: Dict) -> bool:
        """Detect potential data exfiltration"""
        if event.category != EventCategory.DATA_ACCESS:
            return False

        bytes_transferred = event.metadata.get('bytes_transferred', 0)
        if bytes_transferred > rule['threshold']:
            self._create_alert(
                rule['name'],
                rule['severity'],
                EventCategory.DATA_ACCESS,
                [event],
                [event.user or event.source_ip]
            )
            return True

        return False

    def _detect_lateral_movement(self, event: SecurityEvent, rule: Dict) -> bool:
        """Detect lateral movement within network"""
        if event.category != EventCategory.NETWORK:
            return False

        timewindow = timedelta(seconds=rule['timewindow'])
        cutoff = event.timestamp - timewindow

        # Count unique internal destinations from this source
        recent_connections = [e for e in self.events
                            if e.source_ip == event.source_ip and
                            e.category == EventCategory.NETWORK and
                            e.timestamp >= cutoff]

        unique_destinations = set(e.destination_ip for e in recent_connections
                                if e.destination_ip)

        if len(unique_destinations) >= rule['threshold']:
            self._create_alert(
                rule['name'],
                rule['severity'],
                EventCategory.NETWORK,
                recent_connections,
                [event.source_ip]
            )
            return True

        return False

    def _create_alert(self, title: str, severity: SeverityLevel,
                     category: EventCategory, events: List[SecurityEvent],
                     indicators: List[str]):
        """Create security alert"""
        alert = SecurityAlert(
            alert_id=str(uuid.uuid4()),
            title=title,
            severity=severity,
            category=category,
            created_at=datetime.now(),
            events=events,
            indicators=indicators
        )
        self.alerts[alert.alert_id] = alert

    def add_threat_indicator(self, ioc_type: str, value: str,
                           threat_type: str, confidence: int,
                           source: str = "manual"):
        """Add threat indicator to platform"""
        indicator = ThreatIndicator(
            indicator_id=str(uuid.uuid4()),
            ioc_type=ioc_type,
            value=value,
            threat_type=threat_type,
            confidence=confidence,
            source=source,
            first_seen=datetime.now(),
            last_seen=datetime.now()
        )
        self.threat_indicators[value] = indicator

    def get_security_dashboard(self) -> Dict[str, Any]:
        """Generate security operations dashboard"""
        now = datetime.now()
        last_24h = now - timedelta(hours=24)

        recent_events = [e for e in self.events if e.timestamp >= last_24h]
        recent_alerts = [a for a in self.alerts.values()
                        if a.created_at >= last_24h]

        # Count by severity
        alerts_by_severity = defaultdict(int)
        for alert in recent_alerts:
            alerts_by_severity[alert.severity.value] += 1

        # Top source IPs
        source_ip_counts = defaultdict(int)
        for event in recent_events:
            source_ip_counts[event.source_ip] += 1

        top_sources = sorted(source_ip_counts.items(),
                           key=lambda x: x[1], reverse=True)[:10]

        return {
            'timestamp': now.isoformat(),
            'events_24h': len(recent_events),
            'alerts_24h': len(recent_alerts),
            'alerts_by_severity': dict(alerts_by_severity),
            'open_critical_alerts': len([a for a in recent_alerts
                                        if a.severity == SeverityLevel.CRITICAL and
                                        a.status == 'new']),
            'top_source_ips': [{'ip': ip, 'count': count}
                             for ip, count in top_sources]
        }
```

### Incident Response System

```python
class IncidentStatus(Enum):
    NEW = "new"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    ERADICATED = "eradicated"
    RECOVERED = "recovered"
    CLOSED = "closed"

class IncidentSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class IncidentAction:
    action_id: str
    incident_id: str
    action_type: str  # containment, investigation, eradication, recovery
    description: str
    performed_by: str
    timestamp: datetime
    evidence: List[str] = field(default_factory=list)

@dataclass
class SecurityIncident:
    incident_id: str
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    category: str
    discovered_at: datetime
    reported_by: str
    assigned_to: Optional[str] = None
    affected_systems: List[str] = field(default_factory=list)
    affected_users: List[str] = field(default_factory=list)
    indicators: List[str] = field(default_factory=list)
    timeline: List[IncidentAction] = field(default_factory=list)
    root_cause: Optional[str] = None
    lessons_learned: Optional[str] = None
    closed_at: Optional[datetime] = None

    def add_action(self, action_type: str, description: str,
                  performed_by: str, evidence: List[str] = None):
        action = IncidentAction(
            action_id=str(uuid.uuid4()),
            incident_id=self.incident_id,
            action_type=action_type,
            description=description,
            performed_by=performed_by,
            timestamp=datetime.now(),
            evidence=evidence or []
        )
        self.timeline.append(action)

class IncidentResponseSystem:
    def __init__(self):
        self.incidents: Dict[str, SecurityIncident] = {}
        self.response_playbooks: Dict[str, Dict] = {}

        self._initialize_playbooks()

    def _initialize_playbooks(self):
        """Initialize incident response playbooks"""
        self.response_playbooks = {
            'ransomware': {
                'name': 'Ransomware Response',
                'steps': [
                    'Isolate affected systems from network',
                    'Identify ransomware variant',
                    'Preserve forensic evidence',
                    'Assess backup availability',
                    'Notify stakeholders and law enforcement',
                    'Begin recovery from backups',
                    'Conduct post-incident review'
                ]
            },
            'data_breach': {
                'name': 'Data Breach Response',
                'steps': [
                    'Confirm breach and assess scope',
                    'Contain the breach',
                    'Assess data sensitivity and impact',
                    'Notify affected parties as required',
                    'Preserve evidence for investigation',
                    'Implement additional controls',
                    'Document lessons learned'
                ]
            },
            'malware': {
                'name': 'Malware Incident Response',
                'steps': [
                    'Isolate infected systems',
                    'Identify malware type and behavior',
                    'Collect forensic evidence',
                    'Remove malware and clean systems',
                    'Update antivirus signatures',
                    'Restore from clean backups if needed',
                    'Monitor for reinfection'
                ]
            }
        }

    def create_incident(self, incident_data: Dict) -> SecurityIncident:
        incident = SecurityIncident(
            incident_id=incident_data.get('incident_id', f"INC-{len(self.incidents)}"),
            title=incident_data['title'],
            description=incident_data['description'],
            severity=IncidentSeverity(incident_data['severity']),
            status=IncidentStatus.NEW,
            category=incident_data['category'],
            discovered_at=incident_data.get('discovered_at', datetime.now()),
            reported_by=incident_data['reported_by'],
            affected_systems=incident_data.get('affected_systems', []),
            affected_users=incident_data.get('affected_users', [])
        )

        self.incidents[incident.incident_id] = incident
        return incident

    def update_incident_status(self, incident_id: str,
                             new_status: IncidentStatus,
                             performed_by: str, notes: str = ""):
        incident = self.incidents.get(incident_id)
        if not incident:
            raise ValueError("Incident not found")

        old_status = incident.status
        incident.status = new_status

        incident.add_action(
            "status_change",
            f"Status changed from {old_status.value} to {new_status.value}. {notes}",
            performed_by
        )

        if new_status == IncidentStatus.CLOSED:
            incident.closed_at = datetime.now()

    def get_incident_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Generate incident response metrics"""
        cutoff = datetime.now() - timedelta(days=days)

        recent_incidents = [i for i in self.incidents.values()
                          if i.discovered_at >= cutoff]

        if not recent_incidents:
            return {'total_incidents': 0, 'period_days': days}

        # Mean time to detect (MTTD)
        # Mean time to respond (MTTR)
        # Mean time to contain (MTTC)

        closed_incidents = [i for i in recent_incidents
                          if i.status == IncidentStatus.CLOSED]

        resolution_times = []
        for incident in closed_incidents:
            if incident.closed_at:
                resolution_time = (incident.closed_at - incident.discovered_at).total_seconds() / 3600
                resolution_times.append(resolution_time)

        avg_resolution_time = (sum(resolution_times) / len(resolution_times)
                             if resolution_times else 0)

        # Group by severity
        by_severity = defaultdict(int)
        for incident in recent_incidents:
            by_severity[incident.severity.value] += 1

        return {
            'period_days': days,
            'total_incidents': len(recent_incidents),
            'open_incidents': len([i for i in recent_incidents
                                 if i.status != IncidentStatus.CLOSED]),
            'closed_incidents': len(closed_incidents),
            'avg_resolution_hours': avg_resolution_time,
            'by_severity': dict(by_severity),
            'critical_incidents': by_severity.get('critical', 0)
        }
```

### Vulnerability Management System

```python
class VulnerabilitySeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Vulnerability:
    vuln_id: str
    cve_id: Optional[str]  # CVE identifier
    title: str
    description: str
    severity: VulnerabilitySeverity
    cvss_score: float  # 0-10
    affected_systems: List[str]
    discovered_date: datetime
    status: str = "open"  # open, in_progress, remediated, accepted_risk
    remediation_steps: List[str] = field(default_factory=list)
    target_remediation_date: Optional[datetime] = None
    remediated_date: Optional[datetime] = None

@dataclass
class Asset:
    asset_id: str
    hostname: str
    ip_address: str
    asset_type: str  # server, workstation, network_device, etc.
    os: str
    criticality: str  # low, medium, high, critical
    owner: str
    vulnerabilities: List[str] = field(default_factory=list)

class VulnerabilityManagementSystem:
    def __init__(self):
        self.vulnerabilities: Dict[str, Vulnerability] = {}
        self.assets: Dict[str, Asset] = {}

        # SLA for remediation based on severity
        self.remediation_sla = {
            VulnerabilitySeverity.CRITICAL: 7,   # days
            VulnerabilitySeverity.HIGH: 30,
            VulnerabilitySeverity.MEDIUM: 90,
            VulnerabilitySeverity.LOW: 180
        }

    def register_vulnerability(self, vuln_data: Dict) -> Vulnerability:
        vuln = Vulnerability(
            vuln_id=vuln_data.get('vuln_id', str(uuid.uuid4())),
            cve_id=vuln_data.get('cve_id'),
            title=vuln_data['title'],
            description=vuln_data['description'],
            severity=VulnerabilitySeverity(vuln_data['severity']),
            cvss_score=vuln_data['cvss_score'],
            affected_systems=vuln_data['affected_systems'],
            discovered_date=vuln_data.get('discovered_date', datetime.now()),
            remediation_steps=vuln_data.get('remediation_steps', [])
        )

        # Set target remediation date based on SLA
        sla_days = self.remediation_sla[vuln.severity]
        vuln.target_remediation_date = vuln.discovered_date + timedelta(days=sla_days)

        self.vulnerabilities[vuln.vuln_id] = vuln

        # Link to affected assets
        for asset_id in vuln.affected_systems:
            if asset_id in self.assets:
                self.assets[asset_id].vulnerabilities.append(vuln.vuln_id)

        return vuln

    def calculate_risk_score(self, asset: Asset) -> float:
        """Calculate asset risk score based on vulnerabilities"""
        if not asset.vulnerabilities:
            return 0

        vuln_scores = []
        for vuln_id in asset.vulnerabilities:
            vuln = self.vulnerabilities.get(vuln_id)
            if vuln and vuln.status == "open":
                vuln_scores.append(vuln.cvss_score)

        if not vuln_scores:
            return 0

        # Weight by asset criticality
        criticality_multiplier = {
            'low': 0.5,
            'medium': 1.0,
            'high': 1.5,
            'critical': 2.0
        }

        multiplier = criticality_multiplier.get(asset.criticality, 1.0)
        avg_cvss = sum(vuln_scores) / len(vuln_scores)

        return min(10.0, avg_cvss * multiplier)

    def get_vulnerability_dashboard(self) -> Dict[str, Any]:
        """Generate vulnerability management dashboard"""
        open_vulns = [v for v in self.vulnerabilities.values()
                     if v.status == "open"]

        # Count by severity
        by_severity = defaultdict(int)
        for vuln in open_vulns:
            by_severity[vuln.severity.value] += 1

        # Calculate overdue vulnerabilities
        now = datetime.now()
        overdue = [v for v in open_vulns
                  if v.target_remediation_date and
                  v.target_remediation_date < now]

        # High risk assets
        high_risk_assets = []
        for asset in self.assets.values():
            risk_score = self.calculate_risk_score(asset)
            if risk_score >= 7.0:
                high_risk_assets.append({
                    'asset_id': asset.asset_id,
                    'hostname': asset.hostname,
                    'risk_score': risk_score,
                    'vuln_count': len([v for v in asset.vulnerabilities
                                     if self.vulnerabilities.get(v) and
                                     self.vulnerabilities[v].status == "open"])
                })

        return {
            'total_open_vulnerabilities': len(open_vulns),
            'by_severity': dict(by_severity),
            'overdue_vulnerabilities': len(overdue),
            'high_risk_assets': len(high_risk_assets),
            'critical_vulns_pending': by_severity.get('critical', 0)
        }
```

## Best Practices

### SIEM Operations

- Centralize log collection from all critical systems
- Normalize and enrich event data
- Define clear alert escalation criteria
- Tune correlation rules to reduce false positives
- Maintain threat intelligence feeds
- Regular review and update of detection rules
- Archive logs for forensic analysis

### Incident Response

- Maintain documented IR playbooks
- Conduct regular tabletop exercises
- Establish clear escalation procedures
- Preserve forensic evidence properly
- Document all actions taken
- Conduct post-incident reviews
- Update procedures based on lessons learned

### Vulnerability Management

- Continuous asset discovery and inventory
- Regular vulnerability scanning
- Risk-based prioritization (not just severity)
- Track remediation progress and SLAs
- Coordinate with change management
- Verify remediation effectiveness
- Exception handling for accepted risks

### Security Compliance

- Map controls to regulatory requirements
- Maintain evidence documentation
- Automate compliance monitoring where possible
- Regular internal audits
- Track control effectiveness
- Prepare for external audits
- Continuous improvement of security posture

## Anti-Patterns

### Poor Practices

- Alert fatigue from untuned detection rules
- Lack of documented incident procedures
- Ignoring low/medium severity vulnerabilities
- No asset inventory or ownership
- Compliance as checkbox exercise
- Inadequate logging and monitoring
- No security awareness training
- Reactive vs proactive security

### Common Mistakes

- Not validating security alerts
- Delayed incident response
- Inadequate forensic preservation
- Patch management without testing
- Security tools without proper configuration
- Ignoring insider threats
- Insufficient privilege management
- No security metrics or reporting

## Resources

### Security Platforms

- Splunk - SIEM and security analytics
- IBM QRadar - Enterprise SIEM
- Palo Alto Networks - Next-gen firewalls
- CrowdStrike - Endpoint protection
- Tenable - Vulnerability management
- Rapid7 - Security analytics

### Frameworks & Standards

- NIST Cybersecurity Framework
- ISO 27001/27002
- CIS Controls
- MITRE ATT&CK Framework
- PCI-DSS
- GDPR, HIPAA, SOX

### Threat Intelligence

- MISP - Threat intelligence platform
- AlienVault OTX
- VirusTotal
- STIX/TAXII standards

### Learning Resources

- SANS Institute training
- (ISC)² - CISSP certification
- EC-Council - CEH certification
- GIAC certifications
- CISA, CISM certifications

---

_Part of the PCL Standard Library - Master cybersecurity operations and protect organizational assets from evolving threats._
