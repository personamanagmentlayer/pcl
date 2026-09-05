---
name: discord-expert
version: 1.1.0
description: >-
  Expert in Discord bot development using discord.js and discord.py, slash commands,
  embeds, voice channels, moderation, and bot deployment. Use when the user mentions
  communication, community, bots, API, Discord bot, or discord.js, or when the task
  involves Discord Platform, Bot Development, Discord.js Bot, or Discord.py Bot.
category: tools
tags:
  [
    discord,
    communication,
    community,
    bots,
    api,
    discord-bot,
    discordjs,
    discordpy,
    slash-commands,
    discord-embeds,
    voice-bot,
    discord-moderation,
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

# Discord Expert

## Core Concepts

### Discord Platform

- **Bots** - Automated Discord applications
- **Slash Commands** - Modern command interface
- **Interactions** - Buttons, select menus, modals
- **Embeds** - Rich message formatting
- **Voice Channels** - Audio communication
- **Permissions** - Role-based access control

### Bot Development

- **discord.js** - Node.js Discord library
- **discord.py** - Python Discord library
- **Gateway** - WebSocket real-time events
- **REST API** - HTTP endpoints
- **Intents** - Event subscriptions
- **Sharding** - Scaling for large bots

### Key Features

- **Application Commands** - Slash commands, context menus
- **Components** - Buttons, selects, modals
- **Voice** - Audio playback and recording
- **Webhooks** - External message posting
- **Audit Logs** - Server action tracking
- **AutoMod** - Automated moderation

## Best Practices

### Bot Design

- Use slash commands over prefix commands
- Implement proper error handling
- Provide helpful feedback
- Use ephemeral messages appropriately
- Respect rate limits
- Cache data when possible

### UI/UX

- Use embeds for rich content
- Implement interactive components
- Provide clear button labels
- Use consistent color schemes
- Include timestamps
- Add helpful footers

### Moderation

- Implement logging system
- Use permission checks
- Provide audit trails
- Handle appeals process
- Rate limit commands
- Monitor bot actions

### Performance

- Use intents efficiently
- Implement sharding for large bots
- Cache frequently accessed data
- Batch API calls
- Use webhooks for messages
- Monitor bot latency

## Anti-Patterns

### Common Mistakes

- Missing intent permissions
- Not handling rate limits
- Overly complex commands
- Poor error messages
- Hard-coding guild IDs
- Missing permission checks

### Design Issues

- Too many commands
- Unclear command names
- No help documentation
- Inconsistent responses
- Spam-prone features
- Missing loading indicators

### Security Problems

- Exposing bot token
- Missing input validation
- Overly permissive roles
- No command cooldowns
- Weak moderation tools
- Insecure data storage

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Discord.js Bot (JavaScript), Discord.py Bot (Python)

## Resources

### Official Documentation

- [Discord Developer Portal](https://discord.com/developers/docs) - API reference
- [discord.js Guide](https://discordjs.guide/) - JS guide
- [discord.py Documentation](https://discordpy.readthedocs.io/) - Python docs
- [Discord Best Practices](https://discord.com/developers/docs/topics/best-practices) - Guidelines

### Learning Resources

- [Discord.js Tutorial](https://www.youtube.com/watch?v=YSZcyz2-twQ) - Video series
- [discord.py Examples](https://github.com/Rapptz/discord.py/tree/master/examples) - Code samples
- [Discord Bot List](https://top.gg/) - Popular bots
- [Awesome Discord](https://github.com/jagrosh/awesome-discord) - Curated resources

### Tools & Libraries

- [discord.js](https://discord.js.org/) - Node.js library
- [discord.py](https://github.com/Rapptz/discord.py) - Python library
- [Discord Bot Studio](https://botghost.com/) - No-code builder
- [Top.gg](https://top.gg/) - Bot discovery

### Community Resources

- [Discord Developers Server](https://discord.gg/discord-developers) - Official server
- [discord.js Server](https://discord.gg/djs) - Library support
- [discord.py Server](https://discord.gg/dpy) - Python support
- [r/discordapp](https://www.reddit.com/r/discordapp/) - Reddit community
