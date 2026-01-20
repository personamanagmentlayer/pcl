---
description: Expert in Discord bot development using discord.js and discord.py, slash commands, embeds, voice channels, moderation, and bot deployment
tags: ['discord', 'communication', 'community', 'bots', 'api']
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - WebSearch
keywords:
  [
    discord,
    discord-bot,
    discordjs,
    discordpy,
    slash-commands,
    discord-embeds,
    voice-bot,
    discord-moderation,
  ]
category: tools
expertise_level: expert
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

## Implementation Examples

### Discord.js Bot (JavaScript)

```javascript
// index.js
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Register slash commands
const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'user',
    description: 'Get user information',
    options: [
      {
        name: 'target',
        description: 'The user to get info about',
        type: 6, // USER type
        required: false,
      },
    ],
  },
  {
    name: 'poll',
    description: 'Create a poll',
    options: [
      {
        name: 'question',
        description: 'Poll question',
        type: 3, // STRING type
        required: true,
      },
      {
        name: 'options',
        description: 'Poll options (comma separated)',
        type: 3,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('Successfully registered commands');
  } catch (error) {
    console.error(error);
  }
})();

// Event handlers
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('with Discord.js', { type: 'PLAYING' });
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'user') {
    const user = interaction.options.getUser('target') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`User Information: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        {
          name: 'Created',
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: 'Joined',
          value: member
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : 'N/A',
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } else if (commandName === 'poll') {
    const question = interaction.options.getString('question');
    const options = interaction.options
      .getString('options')
      .split(',')
      .map((o) => o.trim());

    if (options.length < 2 || options.length > 10) {
      return await interaction.reply({
        content: 'Please provide 2-10 options',
        ephemeral: true,
      });
    }

    const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('📊 Poll')
      .setDescription(question)
      .addFields(
        options.map((option, i) => ({
          name: `${emoji[i]} Option ${i + 1}`,
          value: option,
          inline: false,
        }))
      )
      .setFooter({ text: `Poll by ${interaction.user.tag}` })
      .setTimestamp();

    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      await message.react(emoji[i]);
    }
  }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  if (customId === 'approve') {
    await interaction.reply({ content: '✅ Approved!', ephemeral: true });
  } else if (customId === 'deny') {
    await interaction.reply({ content: '❌ Denied!', ephemeral: true });
  }
});

// Message with buttons
async function sendApprovalMessage(channel) {
  const embed = new EmbedBuilder()
    .setColor(0xffaa00)
    .setTitle('Approval Request')
    .setDescription('Please approve or deny this request');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('approve')
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('deny')
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// Moderation: Auto-delete spam
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Simple spam detection
  const spamWords = ['spam', 'scam', 'free nitro'];
  const content = message.content.toLowerCase();

  if (spamWords.some((word) => content.includes(word))) {
    await message.delete();
    await message.channel.send({
      content: `${message.author}, your message was deleted for spam.`,
      ephemeral: true,
    });

    // Log to mod channel
    const modChannel = message.guild.channels.cache.find(
      (c) => c.name === 'mod-logs'
    );
    if (modChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Message Deleted - Spam')
        .addFields(
          { name: 'User', value: message.author.tag },
          { name: 'Channel', value: message.channel.name },
          { name: 'Content', value: message.content }
        )
        .setTimestamp();

      await modChannel.send({ embeds: [logEmbed] });
    }
  }
});

// Welcome new members
client.on('guildMemberAdd', async (member) => {
  const welcomeChannel = member.guild.channels.cache.find(
    (c) => c.name === 'welcome'
  );

  if (welcomeChannel) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Welcome!')
      .setDescription(`Welcome to the server, ${member}!`)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields({
        name: 'Member Count',
        value: member.guild.memberCount.toString(),
      })
      .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
```

### Discord.py Bot (Python)

```python
# bot.py
import discord
from discord.ext import commands
from discord import app_commands
import os
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name}')
    await bot.tree.sync()
    await bot.change_presence(activity=discord.Game(name="with Discord.py"))

# Slash command
@bot.tree.command(name="ping", description="Replies with Pong!")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message("Pong!")

@bot.tree.command(name="userinfo", description="Get user information")
@app_commands.describe(member="The member to get info about")
async def userinfo(interaction: discord.Interaction, member: discord.Member = None):
    member = member or interaction.user

    embed = discord.Embed(
        title=f"User Information: {member.name}",
        color=discord.Color.blue()
    )
    embed.set_thumbnail(url=member.display_avatar.url)
    embed.add_field(name="ID", value=member.id, inline=True)
    embed.add_field(name="Created", value=f"<t:{int(member.created_at.timestamp())}:R>", inline=True)
    embed.add_field(name="Joined", value=f"<t:{int(member.joined_at.timestamp())}:R>", inline=True)
    embed.add_field(name="Roles", value=", ".join([role.mention for role in member.roles[1:]]))
    embed.set_footer(text=f"Requested by {interaction.user.name}")
    embed.timestamp = discord.utils.utcnow()

    await interaction.response.send_message(embed=embed)

# Poll command
@bot.tree.command(name="poll", description="Create a poll")
@app_commands.describe(
    question="The poll question",
    options="Poll options (comma separated)"
)
async def poll(interaction: discord.Interaction, question: str, options: str):
    option_list = [opt.strip() for opt in options.split(',')]

    if len(option_list) < 2 or len(option_list) > 10:
        await interaction.response.send_message(
            "Please provide 2-10 options",
            ephemeral=True
        )
        return

    emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

    embed = discord.Embed(
        title="📊 Poll",
        description=question,
        color=discord.Color.green()
    )

    for i, option in enumerate(option_list):
        embed.add_field(
            name=f"{emoji[i]} Option {i + 1}",
            value=option,
            inline=False
        )

    embed.set_footer(text=f"Poll by {interaction.user.name}")
    embed.timestamp = discord.utils.utcnow()

    await interaction.response.send_message(embed=embed)
    message = await interaction.original_response()

    # Add reactions
    for i in range(len(option_list)):
        await message.add_reaction(emoji[i])

# Button view
class ApprovalView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Approve", style=discord.ButtonStyle.success)
    async def approve(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("✅ Approved!", ephemeral=True)

    @discord.ui.button(label="Deny", style=discord.ButtonStyle.danger)
    async def deny(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("❌ Denied!", ephemeral=True)

@bot.tree.command(name="approve", description="Send approval request")
async def approve(interaction: discord.Interaction):
    embed = discord.Embed(
        title="Approval Request",
        description="Please approve or deny this request",
        color=discord.Color.orange()
    )

    view = ApprovalView()
    await interaction.response.send_message(embed=embed, view=view)

# Moderation: Kick command
@bot.tree.command(name="kick", description="Kick a member")
@app_commands.checks.has_permissions(kick_members=True)
@app_commands.describe(member="Member to kick", reason="Reason for kick")
async def kick(interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided"):
    await member.kick(reason=reason)
    await interaction.response.send_message(f"Kicked {member.mention} for: {reason}")

# Auto-mod: Delete spam
@bot.event
async def on_message(message):
    if message.author.bot:
        return

    spam_words = ['spam', 'scam', 'free nitro']
    if any(word in message.content.lower() for word in spam_words):
        await message.delete()
        await message.channel.send(
            f"{message.author.mention}, your message was deleted for spam.",
            delete_after=5
        )

    await bot.process_commands(message)

# Welcome new members
@bot.event
async def on_member_join(member):
    channel = discord.utils.get(member.guild.channels, name='welcome')

    if channel:
        embed = discord.Embed(
            title="Welcome!",
            description=f"Welcome to the server, {member.mention}!",
            color=discord.Color.green()
        )
        embed.set_thumbnail(url=member.display_avatar.url)
        embed.add_field(name="Member Count", value=str(member.guild.member_count))
        embed.timestamp = discord.utils.utcnow()

        await channel.send(embed=embed)

bot.run(os.getenv('DISCORD_TOKEN'))
```

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
