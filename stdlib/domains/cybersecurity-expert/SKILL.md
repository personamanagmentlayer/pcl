---
name: cybersecurity-expert
version: 1.1.0
description: >-
  Build comprehensive cybersecurity solutions including threat detection, incident
  response, vulnerability management, and security compliance monitoring. Use when the user
  mentions threat detection, SIEM, incident response, vulnerability management, security
  monitoring, or security compliance programs.
category: domains
tags:
  [
    security,
    cybersecurity,
    threat-detection,
    incident-response,
    vulnerability,
    siem,
    compliance,
    infosec,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - WebSearch
metadata:
  author: PCL Standard Library
  complexity: expert
  estimated-time: 45 minutes
---

# Cybersecurity Expert

Build comprehensive cybersecurity solutions including threat detection, incident response, vulnerability management, and security compliance monitoring.

## Learning Objectives

- Master security information and event management (SIEM)
- Understand threat detection and incident response
- Implement vulnerability management programs
- Apply security compliance frameworks
- Navigate security operations center (SOC) workflows

## Prerequisites

- Understanding of network security fundamentals
- Knowledge of security frameworks and standards
- Familiarity with common attack vectors
- Experience with security tools and technologies

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

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — SIEM Event Processing System, Incident Response System, Vulnerability Management System

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
