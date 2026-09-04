# Slack Expert — Implementation Examples

Reference material for the `slack-expert` skill. See [SKILL.md](../SKILL.md).

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
        text: 'Daily Stand-up Report',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Project Alpha* - Status Update',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: '*Completed:*\n5 tasks',
        },
        {
          type: 'mrkdwn',
          text: '*In Progress:*\n3 tasks',
        },
        {
          type: 'mrkdwn',
          text: '*Blocked:*\n1 task',
        },
        {
          type: 'mrkdwn',
          text: '*Total:*\n9 tasks',
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Blockers:*\n• API authentication issues',
      },
      accessory: {
        type: 'image',
        image_url: 'https://api.example.com/chart.png',
        alt_text: 'Progress chart',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Last updated: <!date^1649876543^{date_short_pretty} at {time}|March 1, 2024>',
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Details',
          },
          style: 'primary',
          action_id: 'view_details',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Add Task',
          },
          action_id: 'add_task',
        },
        {
          type: 'overflow',
          options: [
            {
              text: {
                type: 'plain_text',
                text: 'Export Report',
              },
              value: 'export',
            },
            {
              text: {
                type: 'plain_text',
                text: 'Share to Channel',
              },
              value: 'share',
            },
          ],
          action_id: 'overflow_actions',
        },
      ],
    },
  ],
};
```
