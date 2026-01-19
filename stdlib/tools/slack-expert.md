---
description: Expert in Slack bot development, Block Kit UI, Events API, slash commands, OAuth flows, and app distribution
keywords: [slack, slack-bot, block-kit, slack-api, slash-commands, slack-oauth, bot-development]
category: tools
expertise_level: expert
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

## Implementation Examples

### Slack Bot with Bolt (JavaScript)

```javascript
// app.js
const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: process.env.PORT || 3000
});

// Listen to slash command
app.command('/hello', async ({ command, ack, say, client }) => {
    await ack();

    try {
        await say({
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `Hello <@${command.user_id}>! :wave:`
                    }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'Click Me'
                            },
                            action_id: 'button_click',
                            value: 'button_value'
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error(error);
    }
});

// Listen to button interactions
app.action('button_click', async ({ body, ack, say }) => {
    await ack();

    await say({
        text: `<@${body.user.id}> clicked the button!`,
        thread_ts: body.message.ts
    });
});

// Listen to app mentions
app.event('app_mention', async ({ event, say }) => {
    await say({
        text: `Hi <@${event.user}>! You mentioned me in <#${event.channel}>`,
        thread_ts: event.ts
    });
});

// Listen to messages in channels
app.message('hello', async ({ message, say }) => {
    await say({
        text: `Hey there <@${message.user}>!`,
        thread_ts: message.ts
    });
});

// Slash command with modal
app.command('/create-task', async ({ command, ack, client }) => {
    await ack();

    try {
        await client.views.open({
            trigger_id: command.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'task_modal',
                title: {
                    type: 'plain_text',
                    text: 'Create Task'
                },
                submit: {
                    type: 'plain_text',
                    text: 'Submit'
                },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'task_title',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'title',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter task title'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Title'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'task_description',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'description',
                            multiline: true,
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter task description'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Description'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'task_priority',
                        element: {
                            type: 'static_select',
                            action_id: 'priority',
                            options: [
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'High'
                                    },
                                    value: 'high'
                                },
                                {
                                    type: 'plain_text',
                                    text: 'Medium'
                                },
                                value: 'medium'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Low'
                                    },
                                    value: 'low'
                                }
                            ]
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Priority'
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error(error);
    }
});

// Handle modal submission
app.view('task_modal', async ({ ack, body, view, client }) => {
    await ack();

    const values = view.state.values;
    const title = values.task_title.title.value;
    const description = values.task_description.description.value;
    const priority = values.task_priority.priority.selected_option.value;

    try {
        // Post confirmation message
        await client.chat.postMessage({
            channel: body.user.id,
            text: `Task created: *${title}*\nPriority: ${priority}\n${description}`
        });

        // Save task to database (pseudo-code)
        // await saveTask({ title, description, priority, userId: body.user.id });

    } catch (error) {
        console.error(error);
    }
});

// Schedule a message
app.event('team_join', async ({ event, client }) => {
    try {
        const result = await client.chat.scheduleMessage({
            channel: event.user.id,
            post_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour later
            text: `Welcome to the team, <@${event.user.id}>! :tada:`
        });

        console.log(`Message scheduled: ${result.scheduled_message_id}`);
    } catch (error) {
        console.error(error);
    }
});

// Start the app
(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
})();
```

### Python Slack Bot

```python
# app.py
import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from dotenv import load_dotenv

load_dotenv()

app = App(token=os.environ["SLACK_BOT_TOKEN"])

# Slash command
@app.command("/hello")
def handle_hello_command(ack, say, command):
    ack()
    say(f"Hello <@{command['user_id']}>! :wave:")

# Message listener
@app.message("hello")
def handle_hello_message(message, say):
    say(
        text=f"Hey there <@{message['user']}>!",
        thread_ts=message['ts']
    )

# App mention
@app.event("app_mention")
def handle_app_mention(event, say):
    say(
        text=f"Hi <@{event['user']}>! You mentioned me.",
        thread_ts=event['ts']
    )

# Button interaction
@app.action("button_click")
def handle_button_click(ack, body, say):
    ack()
    say(f"<@{body['user']['id']}> clicked the button!")

# Modal with form
@app.command("/report-issue")
def open_issue_modal(ack, body, client):
    ack()
    client.views_open(
        trigger_id=body["trigger_id"],
        view={
            "type": "modal",
            "callback_id": "issue_modal",
            "title": {"type": "plain_text", "text": "Report Issue"},
            "submit": {"type": "plain_text", "text": "Submit"},
            "blocks": [
                {
                    "type": "input",
                    "block_id": "issue_title",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "title"
                    },
                    "label": {"type": "plain_text", "text": "Issue Title"}
                },
                {
                    "type": "input",
                    "block_id": "issue_description",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "description",
                        "multiline": True
                    },
                    "label": {"type": "plain_text", "text": "Description"}
                }
            ]
        }
    )

# Handle modal submission
@app.view("issue_modal")
def handle_issue_submission(ack, body, client, view):
    ack()

    values = view["state"]["values"]
    title = values["issue_title"]["title"]["value"]
    description = values["issue_description"]["description"]["value"]

    # Post to channel
    client.chat_postMessage(
        channel="#support",
        text=f"New issue reported by <@{body['user']['id']}>",
        blocks=[
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{title}*\n{description}"
                }
            }
        ]
    )

# File upload handling
@app.event("file_shared")
def handle_file_shared(event, client):
    file_id = event["file_id"]
    file_info = client.files_info(file=file_id)

    print(f"File shared: {file_info['file']['name']}")

# Start app
if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

### Block Kit Advanced UI

```javascript
// Rich interactive message
const complexMessage = {
    blocks: [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'Daily Stand-up Report'
            }
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Project Alpha* - Status Update'
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: '*Completed:*\n5 tasks'
                },
                {
                    type: 'mrkdwn',
                    text: '*In Progress:*\n3 tasks'
                },
                {
                    type: 'mrkdwn',
                    text: '*Blocked:*\n1 task'
                },
                {
                    type: 'mrkdwn',
                    text: '*Total:*\n9 tasks'
                }
            ]
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Blockers:*\n• API authentication issues'
            },
            accessory: {
                type: 'image',
                image_url: 'https://api.example.com/chart.png',
                alt_text: 'Progress chart'
            }
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: 'Last updated: <!date^1649876543^{date_short_pretty} at {time}|March 1, 2024>'
                }
            ]
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'View Details'
                    },
                    style: 'primary',
                    action_id: 'view_details'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Add Task'
                    },
                    action_id: 'add_task'
                },
                {
                    type: 'overflow',
                    options: [
                        {
                            text: {
                                type: 'plain_text',
                                text: 'Export Report'
                            },
                            value: 'export'
                        },
                        {
                            text: {
                                type: 'plain_text',
                                text: 'Share to Channel'
                            },
                            value: 'share'
                        }
                    ],
                    action_id: 'overflow_actions'
                }
            ]
        }
    ]
};
```

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
