---
name: dynamics365-expert
version: 1.1.0
description: >-
  Expert in Dynamics 365 platform, model-driven apps, canvas apps, Power Automate flows,
  Dataverse, plugins, and custom workflows. Use when the user mentions Microsoft platforms,
  ERP, CRM, business apps, the Power Platform, or Dataverse, or when the task involves
  Dynamics 365 Applications, Dataverse Platform, Customization & Development, or Plugin
  Development.
category: domains
tags:
  [
    microsoft,
    erp,
    crm,
    business-apps,
    dynamics365,
    power-platform,
    dataverse,
    model-driven-apps,
    canvas-apps,
    power-automate,
    dynamics-crm,
    plugins,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - WebSearch
metadata:
  author: PCL Standard Library
  complexity: expert
---

# Dynamics 365 Expert

## Core Concepts

### Dynamics 365 Applications

- **Sales** - Sales force automation and CRM
- **Customer Service** - Service management and support
- **Field Service** - Field operations management
- **Marketing** - Marketing automation
- **Finance** - Financial management
- **Supply Chain** - Operations and logistics
- **Human Resources** - HR management
- **Commerce** - E-commerce and retail

### Dataverse Platform

- **Tables** - Data storage entities (formerly entities)
- **Columns** - Field definitions (formerly attributes)
- **Relationships** - Entity associations
- **Business Rules** - No-code validation logic
- **Security Roles** - Role-based access control
- **Solutions** - Packaging and deployment

### Customization & Development

- **Model-Driven Apps** - Data-driven applications
- **Canvas Apps** - Flexible UI applications
- **Plugins** - Server-side event handlers (C#)
- **Custom Workflows** - Process automation
- **Web Resources** - JavaScript, CSS, HTML files
- **Power Automate** - Cloud flows and automation

## Best Practices

### Solution Architecture

- Use solutions for all customizations
- Implement managed solutions for production
- Use segmented solutions for modularity
- Version control solution files
- Document dependencies
- Test in dev/test environments

### Plugin Development

- Register plugins in sandbox mode
- Implement proper exception handling
- Use tracing for debugging
- Follow early-bound vs late-bound patterns
- Optimize for performance
- Write unit tests

### Security & Compliance

- Implement field-level security
- Use security roles appropriately
- Apply hierarchical security when needed
- Enable auditing for compliance
- Regular security reviews
- Follow data privacy regulations

### Performance Optimization

- Minimize plugin executions
- Use asynchronous plugins when possible
- Optimize FetchXML queries
- Implement caching strategies
- Use bulk operations
- Monitor plugin performance

## Anti-Patterns

### Development Issues

- Synchronous plugins for long operations
- Insufficient error handling
- Hard-coded GUIDs and URLs
- Missing null checks
- Recursive plugin loops
- Overuse of JavaScript on forms

### Design Problems

- Over-customization of entities
- Poor data model design
- Inconsistent naming conventions
- Not using solutions
- Missing documentation
- No testing strategy

### Performance Problems

- Retrieving all columns when not needed
- Nested loops in plugins
- Synchronous workflows for batch operations
- Missing indexes on custom fields
- Inefficient FetchXML queries
- Too many form scripts

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Plugin Development (C#), JavaScript Web Resource, Power Automate Flow with Dataverse

## Resources

### Official Documentation

- [Dynamics 365 Documentation](https://docs.microsoft.com/dynamics365/) - Complete guide
- [Dataverse Documentation](https://docs.microsoft.com/power-apps/developer/data-platform/) - Platform docs
- [Power Platform Documentation](https://docs.microsoft.com/power-platform/) - Platform overview
- [Web API Reference](https://docs.microsoft.com/power-apps/developer/data-platform/webapi/reference) - API docs

### Learning Platforms

- [Microsoft Learn](https://learn.microsoft.com/training/dynamics365/) - Training paths
- [Power Platform Learning](https://powerapps.microsoft.com/learn/) - Courses
- [Dynamics 365 Training](https://dynamics.microsoft.com/training/) - Official training
- [Microsoft Virtual Training Days](https://www.microsoft.com/trainingdays) - Live events

### Tools & Resources

- [XrmToolBox](https://www.xrmtoolbox.com/) - Essential toolset
- [Plugin Registration Tool](https://docs.microsoft.com/power-apps/developer/data-platform/download-tools-nuget) - Register plugins
- [Configuration Migration Tool](https://docs.microsoft.com/power-platform/admin/manage-configuration-data) - Data migration
- [Solution Packager](https://docs.microsoft.com/power-platform/alm/solution-packager-tool) - Version control

### Community Resources

- [Power Platform Community](https://powerusers.microsoft.com/) - Forums
- [Dynamics 365 Community](https://community.dynamics.com/) - User community
- [GitHub Power Platform](https://github.com/microsoft/PowerPlatform-Samples) - Sample code
- [Power Platform Blog](https://powerapps.microsoft.com/blog/) - Product updates
