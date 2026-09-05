---
name: teams-expert
version: 1.1.0
description: >-
  Expert in Microsoft Teams bot development, tabs, messaging extensions, adaptive cards,
  Graph API integration, and Teams app deployment. Use when the user mentions Microsoft
  platforms Microsoft Teams, Microsoft Teams, communication, collaboration, Microsoft
  platforms, or Microsoft Teams bot, or when the task involves Teams Platform, Bot
  Framework, Teams Bot, or Tab Application.
category: tools
tags:
  [
    microsoft-teams,
    teams,
    communication,
    collaboration,
    microsoft,
    teams-bot,
    adaptive-cards,
    teams-app,
    messaging-extensions,
    graph-api,
    teams-toolkit,
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

# Microsoft Teams Expert

## Core Concepts

### Teams Platform

- **Bots** - Conversational interfaces
- **Tabs** - Embedded web experiences
- **Messaging Extensions** - Search and action commands
- **Webhooks** - Incoming/outgoing connectors
- **Adaptive Cards** - Rich interactive cards
- **Task Modules** - Modal dialogs

### Bot Framework

- **Bot Framework SDK** - Microsoft bot development
- **Teams Toolkit** - VS Code extension
- **Bot Composer** - Visual bot builder
- **LUIS** - Language understanding
- **QnA Maker** - Knowledge base bot
- **Azure Bot Service** - Bot hosting

### Integration

- **Graph API** - Teams data access
- **SSO** - Single sign-on
- **Deep Links** - Navigate within Teams
- **Activity Feed** - Notifications
- **Meeting Extensions** - In-meeting apps
- **App Studio** - App configuration tool

## Best Practices

### Bot Development

- Use Adaptive Cards for rich UX
- Implement proactive messaging carefully
- Handle rate limits properly
- Provide clear help commands
- Use task modules for complex forms
- Test in multiple Teams clients

### Tab Development

- Use Teams JavaScript SDK
- Implement SSO for authentication
- Support light/dark themes
- Optimize for mobile
- Handle Teams context
- Deep link appropriately

### Security

- Validate all tokens
- Use HTTPS everywhere
- Implement proper OAuth flows
- Store secrets securely
- Validate user permissions
- Sanitize user input

### Performance

- Minimize bot response time
- Use caching strategies
- Lazy load tab content
- Optimize images and assets
- Use CDN for static content
- Monitor API usage

## Anti-Patterns

### Common Mistakes

- Not handling Teams context
- Ignoring mobile experience
- Overly complex Adaptive Cards
- Missing error handling
- Hard-coding tenant IDs
- Not testing in Teams

### Design Issues

- Too many bot commands
- Unclear command syntax
- Poor mobile layout
- Inconsistent styling
- Missing loading states
- No offline support

### Security Problems

- Exposing secrets in code
- Not validating tokens
- Missing authorization checks
- Insecure data storage
- No logging/monitoring
- Weak error messages

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Teams Bot (Node.js), Tab Application (React), Messaging Extension

## Resources

### Official Documentation

- [Teams Developer Docs](https://learn.microsoft.com/microsoftteams/platform/) - Complete guide
- [Bot Framework SDK](https://learn.microsoft.com/azure/bot-service/) - Bot development
- [Adaptive Cards](https://adaptivecards.io/) - Card designer
- [Graph API](https://learn.microsoft.com/graph/) - Data access

### Learning Resources

- [Teams Samples](https://github.com/OfficeDev/Microsoft-Teams-Samples) - Code samples
- [Microsoft Learn](https://learn.microsoft.com/training/teams/) - Training modules
- [Teams YouTube](https://www.youtube.com/@MicrosoftTeams) - Video tutorials
- [Teams Blog](https://techcommunity.microsoft.com/t5/microsoft-teams-blog/bg-p/MicrosoftTeamsBlog) - Updates

### Tools & Libraries

- [Teams Toolkit](https://learn.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals) - VS Code extension
- [App Studio](https://learn.microsoft.com/microsoftteams/platform/concepts/build-and-test/app-studio-overview) - App configuration
- [MGT Components](https://learn.microsoft.com/graph/toolkit/overview) - UI components
- [Yo Teams](https://github.com/pnp/generator-teams) - Yeoman generator

### Community Resources

- [Teams Community](https://techcommunity.microsoft.com/t5/microsoft-teams/ct-p/MicrosoftTeams) - Forums
- [GitHub Teams](https://github.com/OfficeDev) - Sample code
- [Stack Overflow](https://stackoverflow.com/questions/tagged/microsoft-teams) - Q&A
- [Twitter @MicrosoftTeams](https://twitter.com/MicrosoftTeams) - News
