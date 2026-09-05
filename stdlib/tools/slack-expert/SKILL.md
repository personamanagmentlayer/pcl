---
name: slack-expert
version: 1.1.0
description: >-
  Expert in Slack bot development, Block Kit UI, Events API, slash commands, OAuth flows,
  and app distribution. Use when the user mentions communication, collaboration, bots, API,
  Slack bot, or Block Kit, or when the task involves Slack Platform, Development Tools,
  Slack Bot with Bolt, or Python Slack Bot.
category: tools
tags:
  [
    slack,
    communication,
    collaboration,
    bots,
    api,
    slack-bot,
    block-kit,
    slack-api,
    slash-commands,
    slack-oauth,
    bot-development,
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

# Slack Expert

## Core Concepts

### Slack Platform

- **Bolt Framework** - Official Slack app framework
- **Web API** - HTTP-based API methods
- **Events API** - Real-time event subscriptions
- **Socket Mode** - WebSocket-based connectivity
- **OAuth** - App installation and permissions
- **App Distribution** - App Directory publishing

### Key Features

- **Slash Commands** - Custom commands (/command)
- **Interactive Components** - Buttons, menus, modals
- **Block Kit** - Rich message formatting
- **Workflows** - No-code automation
- **App Home** - Custom app interface
- **Shortcuts** - Quick actions

### Development Tools

- **Bolt for JavaScript** - Node.js framework
- **Bolt for Python** - Python framework
- **Block Kit Builder** - Visual UI designer
- **Slack CLI** - Command-line tools
- **Manifest** - App configuration
- **Webhooks** - Incoming webhooks

## Best Practices

### Bot Design

- Use clear, concise commands
- Provide helpful error messages
- Implement command validation
- Use threading for conversations
- Respect rate limits
- Handle errors gracefully

### UI/UX

- Use Block Kit for rich formatting
- Provide interactive components
- Keep modals simple and focused
- Use consistent styling
- Provide feedback for actions
- Make messages scannable

### Security

- Validate signing secrets
- Use OAuth for installations
- Request minimal scopes
- Store tokens securely
- Implement rate limiting
- Sanitize user input

### Performance

- Use async/await properly
- Batch API calls when possible
- Cache frequently accessed data
- Use Socket Mode for real-time
- Monitor API usage
- Implement retry logic

## Anti-Patterns

### Common Mistakes

- Not acknowledging interactions quickly
- Overly complex modal forms
- Spamming channels with messages
- Missing error handling
- Hard-coding channel IDs
- Ignoring rate limits

### Design Issues

- Too many slash commands
- Unclear command syntax
- No help documentation
- Poor button labels
- Inconsistent responses
- Missing user feedback

### Security Problems

- Exposing tokens in code
- Not validating requests
- Over-scoped permissions
- Missing input validation
- No logging/monitoring
- Insecure data storage

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Slack Bot with Bolt (JavaScript), Python Slack Bot, Block Kit Advanced UI

## Resources

### Official Documentation

- [Slack API Documentation](https://api.slack.com/) - Complete reference
- [Bolt Framework](https://slack.dev/bolt-js/) - JavaScript framework
- [Block Kit](https://api.slack.com/block-kit) - UI framework
- [App Manifest](https://api.slack.com/reference/manifests) - App configuration

### Learning Resources

- [Slack Tutorials](https://api.slack.com/tutorials) - Official tutorials
- [Block Kit Builder](https://app.slack.com/block-kit-builder) - Visual designer
- [Slack Community](https://api.slack.com/community) - Forums and discussions
- [YouTube Slack Dev](https://www.youtube.com/@SlackPlatform) - Video tutorials

### Tools & Libraries

- [Slack CLI](https://api.slack.com/automation/cli) - Command-line tools
- [slack-ruby-bot](https://github.com/slack-ruby/slack-ruby-bot) - Ruby framework
- [Slackbot](https://github.com/lins05/slackbot) - Python bot
- [node-slack-sdk](https://github.com/slackapi/node-slack-sdk) - Node.js SDK

### Community Resources

- [Slack Platform Blog](https://api.slack.com/blog) - Updates
- [GitHub Slack](https://github.com/slackapi) - Sample code
- [Stack Overflow](https://stackoverflow.com/questions/tagged/slack-api) - Q&A
- [Twitter @SlackAPI](https://twitter.com/SlackAPI) - News
