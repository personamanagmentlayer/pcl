---
name: microsoft365-expert
version: 1.1.0
description: >-
  Expert in Microsoft 365 ecosystem, Power Platform, SharePoint Online, Microsoft Teams,
  Graph API, and Microsoft 365 administration. Use when the user mentions Microsoft
  platforms, Office 365, productivity, cloud, the Power Platform, or SharePoint, or when
  the task involves Microsoft 365 Services, Power Platform, Graph API, or Power Automate
  Flow.
category: domains
tags:
  [
    microsoft,
    office365,
    m365,
    productivity,
    cloud,
    microsoft365,
    power-platform,
    sharepoint,
    teams,
    graph-api,
    powerapps,
    power-automate,
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

# Microsoft 365 Expert

## Core Concepts

### Microsoft 365 Services

- **Exchange Online** - Email and calendar services
- **SharePoint Online** - Document management and collaboration
- **Microsoft Teams** - Chat, meetings, and collaboration
- **OneDrive** - Personal cloud storage
- **Power Platform** - Low-code/no-code app development
- **Microsoft 365 Apps** - Office applications (Word, Excel, PowerPoint)

### Power Platform

- **Power Apps** - Custom business applications
- **Power Automate** - Workflow automation
- **Power BI** - Business intelligence and analytics
- **Power Virtual Agents** - Chatbot creation
- **Dataverse** - Business data platform
- **Connectors** - Integration with external services

### Graph API

- **Users & Groups** - Identity and access management
- **Mail & Calendar** - Email and scheduling
- **Files & Sites** - Document management
- **Teams** - Chat and collaboration
- **Planner** - Task management
- **Authentication** - OAuth 2.0 and OpenID Connect

## Best Practices

### Microsoft 365 Administration

- Implement multi-factor authentication (MFA)
- Use conditional access policies
- Regular security audits and compliance reviews
- Implement data loss prevention (DLP) policies
- Use sensitivity labels for data classification
- Monitor usage analytics

### Power Platform Development

- Follow naming conventions for apps and flows
- Implement proper error handling
- Use environment variables for configuration
- Test in development before production
- Document complex formulas
- Use connections securely

### Graph API Integration

- Use application permissions appropriately
- Implement proper token caching
- Handle rate limiting and throttling
- Use batch requests for multiple operations
- Implement retry logic with exponential backoff
- Log API calls for troubleshooting

### SharePoint Best Practices

- Use modern sites over classic
- Implement proper information architecture
- Use content types for consistency
- Apply metadata for better organization
- Regular backup and retention policies
- Optimize page performance

## Anti-Patterns

### Configuration Issues

- Over-privileged service accounts
- Sharing sensitive data externally without controls
- No backup or disaster recovery plan
- Inconsistent naming conventions
- Missing governance policies
- No usage monitoring

### Development Problems

- Hard-coded credentials in flows
- Overly complex Power Apps formulas
- Missing error handling in automations
- No testing in non-production environments
- Tight coupling between components
- Poor documentation

### Performance Issues

- Large attachments in emails
- Inefficient SharePoint queries
- Too many API calls
- Large Power Apps with slow load times
- Synchronous processing for long operations
- No caching strategy

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Microsoft Graph API Integration, Power Automate Flow (JSON), PowerShell SharePoint Management, Power Apps Formula Examples

## Resources

### Official Documentation

- [Microsoft 365 Documentation](https://docs.microsoft.com/microsoft-365/) - Complete guide
- [Graph API Reference](https://docs.microsoft.com/graph/) - API documentation
- [Power Platform Documentation](https://docs.microsoft.com/power-platform/) - Low-code platforms
- [SharePoint Documentation](https://docs.microsoft.com/sharepoint/) - SharePoint guide

### Learning Platforms

- [Microsoft Learn](https://learn.microsoft.com/) - Free training paths
- [Power Platform Learning](https://powerapps.microsoft.com/learn/) - Power Platform courses
- [Microsoft 365 Training](https://support.microsoft.com/training) - End-user training
- [Microsoft Virtual Training Days](https://www.microsoft.com/trainingdays) - Live training

### Tools & Resources

- [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer) - Test Graph API
- [PnP PowerShell](https://pnp.github.io/powershell/) - SharePoint automation
- [Power Platform CLI](https://docs.microsoft.com/power-platform/developer/cli/introduction) - Command-line tools
- [SharePoint PnP](https://pnp.github.io/) - Patterns and practices

### Community Resources

- [Microsoft 365 Community](https://techcommunity.microsoft.com/t5/microsoft-365/ct-p/microsoft365) - Forums
- [Power Platform Community](https://powerusers.microsoft.com/) - Power users forum
- [Microsoft 365 Blog](https://www.microsoft.com/microsoft-365/blog/) - Product updates
- [GitHub Microsoft 365](https://github.com/pnp) - Sample code
