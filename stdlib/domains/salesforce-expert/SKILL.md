---
name: salesforce-expert
version: 1.1.0
description: >-
  Expert in Salesforce platform development, Apex programming, Lightning Web Components,
  SOQL/SOSL queries, Salesforce APIs, and AppExchange solutions. Use when the user mentions
  CRM, cloud, business apps, Apex, Lightning Web Components, or Lightning, or when the task
  involves Salesforce Platform, Development Components, Integration & APIs, or Apex Trigger
  with Handler Pattern.
category: domains
tags:
  [
    salesforce,
    crm,
    cloud,
    business-apps,
    apex,
    lwc,
    lightning,
    soql,
    salesforce-api,
    force-platform,
    appexchange,
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
---

# Salesforce Expert

## Core Concepts

### Salesforce Platform

- **Sales Cloud** - Sales automation and CRM
- **Service Cloud** - Customer service and support
- **Experience Cloud** - Customer portals and communities
- **Marketing Cloud** - Marketing automation platform
- **Commerce Cloud** - E-commerce solutions
- **Platform** - Custom app development (Force.com)

### Development Components

- **Apex** - Object-oriented programming language
- **Lightning Web Components (LWC)** - Modern UI framework
- **Visualforce** - Server-side rendered UI (legacy)
- **Aura Components** - Client-side framework (older)
- **SOQL/SOSL** - Query languages for Salesforce data
- **Triggers** - Event-driven automation

### Integration & APIs

- **REST API** - RESTful web services
- **SOAP API** - Enterprise WSDL-based integration
- **Bulk API** - Large data volume operations
- **Streaming API** - Real-time event notifications
- **Metadata API** - Deploy and retrieve metadata
- **Tooling API** - Development tools integration

## Best Practices

### Development Standards

- Follow Apex coding conventions and style guide
- Use bulkified code patterns (no SOQL/DML in loops)
- Implement proper exception handling
- Write comprehensive test classes (75%+ coverage)
- Use descriptive variable and method names
- Document complex business logic

### Governor Limits

- Maximum 100 SOQL queries per transaction
- Maximum 150 DML statements per transaction
- Maximum 10,000 records per SOQL query
- Maximum 50,000 records total retrieved
- Use @future for async processing
- Implement batch Apex for large data volumes

### Security Best Practices

- Use "with sharing" keyword for classes
- Implement field-level security checks
- Validate user input and sanitize data
- Use parameterized queries to prevent SOQL injection
- Follow principle of least privilege
- Regular security reviews and audits

### Lightning Best Practices

- Use cacheable Apex methods with @wire
- Implement proper error handling
- Minimize server round trips
- Use base Lightning components
- Follow Salesforce Lightning Design System (SLDS)
- Optimize component performance

## Anti-Patterns

### Code Smells

- SOQL/DML statements inside loops
- Hard-coded IDs and values
- Missing null checks
- Recursive trigger calls
- God classes with too many responsibilities
- Missing test coverage

### Design Issues

- Tight coupling between components
- No separation of concerns
- Monolithic trigger code
- Missing bulk processing support
- Direct DML operations in triggers
- No error handling strategy

### Performance Issues

- Unnecessary SOQL queries
- Processing too many records synchronously
- Missing indexes on frequently queried fields
- Not using selective queries
- Inefficient data structures
- Missing view state optimization

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Apex Trigger with Handler Pattern, Lightning Web Component, Batch Apex for Data Processing, REST API Integration

## Resources

### Official Documentation

- [Salesforce Developer Documentation](https://developer.salesforce.com/docs) - Complete reference
- [Apex Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/) - Language guide
- [Lightning Component Library](https://developer.salesforce.com/docs/component-library) - UI components
- [API Reference](https://developer.salesforce.com/docs/apis) - All Salesforce APIs

### Learning Platforms

- [Trailhead](https://trailhead.salesforce.com/) - Free interactive learning
- [Salesforce Developer Centers](https://developer.salesforce.com/) - Resources and tools
- [Salesforce Help](https://help.salesforce.com/) - Product documentation
- [Salesforce University](https://www.salesforce.com/services/learning-and-certification/) - Official training

### Tools & Extensions

- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) - Command-line interface
- [VS Code Salesforce Extensions](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode) - IDE support
- [Developer Console](https://help.salesforce.com/articleView?id=code_dev_console.htm) - Browser-based IDE
- [Workbench](https://workbench.developerforce.com/) - Web-based admin tool

### Community Resources

- [Salesforce Stack Exchange](https://salesforce.stackexchange.com/) - Q&A community
- [Salesforce Developer Forums](https://developer.salesforce.com/forums) - Discussion boards
- [GitHub Salesforce Samples](https://github.com/trailheadapps) - Example applications
- [Salesforce Blog](https://developer.salesforce.com/blogs) - Technical articles
