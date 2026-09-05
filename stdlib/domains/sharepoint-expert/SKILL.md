---
name: sharepoint-expert
version: 1.1.0
description: >-
  Expert in SharePoint Server and SharePoint Online, site collections, lists and libraries,
  workflows, SharePoint Framework (SPFx), and PnP patterns. Use when the user mentions
  Microsoft platforms, collaboration, intranet, CMS, SPFx, or SharePoint framework, or when
  the task involves SharePoint Architecture, Development Approaches, Content Management, or
  SPFx Web Part with React.
category: domains
tags:
  [
    sharepoint,
    microsoft,
    collaboration,
    intranet,
    cms,
    spfx,
    sharepoint-framework,
    pnp,
    sharepoint-online,
    site-collections,
    content-types,
    workflows,
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

# SharePoint Expert

## Core Concepts

### SharePoint Architecture

- **Site Collections** - Top-level sites with shared settings
- **Sites & Subsites** - Hierarchical structure
- **Lists & Libraries** - Data storage containers
- **Content Types** - Reusable content definitions
- **Site Columns** - Reusable field definitions
- **Permissions** - Security and access control

### Development Approaches

- **SPFx** - SharePoint Framework (modern)
- **Add-ins** - SharePoint-hosted and provider-hosted apps
- **Web Parts** - Custom UI components
- **Extensions** - Application customizers, field customizers
- **REST API** - RESTful web services
- **CSOM** - Client-Side Object Model

### Content Management

- **Document Management** - Version control, check-in/out
- **Metadata** - Columns and managed metadata
- **Search** - Enterprise search capabilities
- **Workflows** - Business process automation
- **Information Management** - Retention and policies
- **Records Management** - Compliance and governance

## Best Practices

### Site Architecture

- Use hub sites for site association
- Implement flat site structure (avoid deep subsites)
- Use modern sites over classic
- Apply consistent branding and theming
- Use site templates for standardization
- Implement proper governance

### Content Organization

- Use content types for consistency
- Apply metadata for better findability
- Implement managed metadata for taxonomy
- Use document sets for related documents
- Configure version control appropriately
- Set up retention and disposal policies

### Development Standards

- Follow SPFx development guidelines
- Use PnP libraries for common operations
- Implement proper error handling
- Use TypeScript for type safety
- Test in dev/test before production
- Document custom solutions

### Performance Optimization

- Minimize REST API calls
- Use batch operations for multiple requests
- Implement caching strategies
- Optimize views and queries
- Use indexed columns for large lists
- Avoid client-side heavy operations

## Anti-Patterns

### Architecture Issues

- Deep site hierarchy (more than 2-3 levels)
- Over-customization of out-of-box features
- Using classic sites for new development
- Inconsistent information architecture
- No governance or naming conventions
- Mixed modern and classic experiences

### Development Problems

- Using JSOM in new solutions (use REST or PnP)
- Hard-coding site URLs
- No error handling
- Synchronous operations blocking UI
- Direct DOM manipulation
- Missing responsive design

### Content Management Issues

- Using folders instead of metadata
- Not leveraging content types
- Poor metadata strategy
- No retention policies
- Inadequate permissions structure
- Missing backup strategy

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — SPFx Web Part with React, PnP PowerShell Provisioning, REST API Operations (JavaScript)

## Resources

### Official Documentation

- [SharePoint Documentation](https://docs.microsoft.com/sharepoint/) - Complete guide
- [SPFx Documentation](https://docs.microsoft.com/sharepoint/dev/spfx/sharepoint-framework-overview) - Framework guide
- [REST API Reference](https://docs.microsoft.com/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service) - API docs
- [PnP Documentation](https://pnp.github.io/) - Patterns and practices

### Learning Platforms

- [Microsoft Learn SharePoint](https://learn.microsoft.com/training/browse/?products=sharepoint) - Training modules
- [SharePoint Dev Center](https://developer.microsoft.com/sharepoint) - Developer resources
- [SharePoint Community](https://techcommunity.microsoft.com/t5/sharepoint/ct-p/SharePoint) - Forums
- [YouTube SharePoint Channel](https://www.youtube.com/sharepoint) - Video tutorials

### Tools & Resources

- [PnP PowerShell](https://pnp.github.io/powershell/) - Automation cmdlets
- [PnP JS](https://pnp.github.io/pnpjs/) - JavaScript library
- [SPFx Yeoman Generator](https://www.npmjs.com/package/@microsoft/generator-sharepoint) - Project scaffolding
- [SharePoint Online Management Shell](https://www.microsoft.com/download/details.aspx?id=35588) - PowerShell module

### Community Resources

- [PnP GitHub](https://github.com/pnp) - Sample code and libraries
- [SharePoint StackExchange](https://sharepoint.stackexchange.com/) - Q&A community
- [SharePoint User Group](https://www.meetup.com/topics/sharepoint/) - Local meetups
- [M365 PnP Community](https://pnp.github.io/#community) - Weekly calls and demos
