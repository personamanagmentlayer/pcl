---
description: Expert in Microsoft Teams bot development, tabs, messaging extensions, adaptive cards, Graph API integration, and Teams app deployment
tags:
  ['microsoft-teams', 'teams', 'communication', 'collaboration', 'microsoft']
allowed-tools:
  - Read
  - Write
  - Bash
  - WebSearch
keywords:
  [
    microsoft-teams,
    teams-bot,
    adaptive-cards,
    teams-app,
    messaging-extensions,
    graph-api,
    teams-toolkit,
  ]
category: tools
expertise_level: expert
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

## Implementation Examples

### Teams Bot (Node.js)

```javascript
// bot.js
const {
  TeamsActivityHandler,
  CardFactory,
  MessageFactory,
} = require('botbuilder');

class TeamsBot extends TeamsActivityHandler {
  constructor() {
    super();

    // Handle messages
    this.onMessage(async (context, next) => {
      const text = context.activity.text.trim().toLowerCase();

      if (text === 'help') {
        await this.sendHelpCard(context);
      } else if (text.startsWith('create task')) {
        await this.handleCreateTask(context);
      } else {
        await context.sendActivity(`You said: ${context.activity.text}`);
      }

      await next();
    });

    // Handle mentions
    this.onTeamsMembersAdded(async (membersAdded, teamInfo, context, next) => {
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(`Welcome to the team, ${member.name}!`);
        }
      }
      await next();
    });

    // Handle card actions
    this.onAdaptiveCardInvoke(async (context, invokeValue) => {
      const action = invokeValue.action;

      if (action.verb === 'createTask') {
        return await this.createTask(context, action.data);
      }

      return { statusCode: 200 };
    });
  }

  async sendHelpCard(context) {
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          size: 'Large',
          weight: 'Bolder',
          text: 'Available Commands',
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'help',
              value: 'Show this help message',
            },
            {
              title: 'create task',
              value: 'Create a new task',
            },
            {
              title: 'list tasks',
              value: 'Show all tasks',
            },
          ],
        },
      ],
    });

    await context.sendActivity({ attachments: [card] });
  }

  async handleCreateTask(context) {
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'Create New Task',
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'Input.Text',
          id: 'taskTitle',
          placeholder: 'Enter task title',
          label: 'Title',
        },
        {
          type: 'Input.Text',
          id: 'taskDescription',
          placeholder: 'Enter description',
          multiline: true,
          label: 'Description',
        },
        {
          type: 'Input.ChoiceSet',
          id: 'taskPriority',
          label: 'Priority',
          choices: [
            { title: 'High', value: 'high' },
            { title: 'Medium', value: 'medium' },
            { title: 'Low', value: 'low' },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.Execute',
          title: 'Create Task',
          verb: 'createTask',
        },
      ],
    });

    await context.sendActivity({ attachments: [card] });
  }

  async createTask(context, data) {
    const { taskTitle, taskDescription, taskPriority } = data;

    // Save task (pseudo-code)
    // await database.tasks.create({ title: taskTitle, description, priority });

    const confirmationCard = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '✅ Task Created',
          weight: 'Bolder',
          color: 'Good',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Title', value: taskTitle },
            { title: 'Priority', value: taskPriority },
          ],
        },
      ],
    });

    await context.sendActivity({ attachments: [confirmationCard] });

    return { statusCode: 200 };
  }

  // Handle messaging extension queries
  async handleTeamsMessagingExtensionQuery(context, query) {
    const searchQuery = query.parameters[0].value;

    // Search implementation (pseudo-code)
    const results = await searchTasks(searchQuery);

    const attachments = results.map((task) => {
      const card = CardFactory.thumbnailCard(
        task.title,
        task.description,
        [],
        [
          {
            type: 'openUrl',
            title: 'View',
            value: `https://app.example.com/tasks/${task.id}`,
          },
        ]
      );

      const preview = CardFactory.thumbnailCard(task.title, task.description);

      return { ...card, preview };
    });

    return {
      composeExtension: {
        type: 'result',
        attachmentLayout: 'list',
        attachments,
      },
    };
  }
}

module.exports.TeamsBot = TeamsBot;

// index.js
const restify = require('restify');
const {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
} = require('botbuilder');
const { TeamsBot } = require('./bot');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`Bot listening on ${server.url}`);
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
});

const adapter = new CloudAdapter(botFrameworkAuthentication);
const bot = new TeamsBot();

server.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});
```

### Tab Application (React)

```typescript
// TeamsTab.tsx
import { useEffect, useState } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';
import { Providers, ProviderState } from '@microsoft/mgt-element';
import { TeamsMsal2Provider } from '@microsoft/mgt-teams-msal2-provider';
import { Person, PeoplePicker } from '@microsoft/mgt-react';

function TeamsTab() {
    const [context, setContext] = useState<microsoftTeams.app.Context | null>(null);
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        // Initialize Teams SDK
        microsoftTeams.app.initialize().then(() => {
            microsoftTeams.app.getContext().then((ctx) => {
                setContext(ctx);

                // Setup auth provider
                TeamsMsal2Provider.microsoftTeamsLib = microsoftTeams;

                Providers.globalProvider = new TeamsMsal2Provider({
                    clientId: process.env.REACT_APP_CLIENT_ID!,
                    scopes: ['User.Read', 'Tasks.ReadWrite']
                });

                loadTasks();
            });
        });
    }, []);

    const loadTasks = async () => {
        try {
            const response = await fetch('/api/tasks', {
                headers: {
                    'Authorization': `Bearer ${await getAuthToken()}`
                }
            });
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    };

    const getAuthToken = async () => {
        return new Promise((resolve, reject) => {
            microsoftTeams.authentication.getAuthToken({
                successCallback: (token) => resolve(token),
                failureCallback: (error) => reject(error)
            });
        });
    };

    const handleCreateTask = () => {
        microsoftTeams.dialog.open({
            title: 'Create Task',
            url: `${window.location.origin}/create-task`,
            size: {
                height: 400,
                width: 600
            }
        }, (result) => {
            if (result) {
                loadTasks();
            }
        });
    };

    return (
        <div className="teams-tab">
            <h1>Task Manager</h1>
            <button onClick={handleCreateTask}>Create Task</button>

            <div className="task-list">
                {tasks.map(task => (
                    <div key={task.id} className="task-card">
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                        <Person userId={task.assignedTo} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TeamsTab;
```

### Messaging Extension

```json
{
  "composeExtensions": [
    {
      "botId": "your-bot-id",
      "commands": [
        {
          "id": "searchTasks",
          "type": "query",
          "title": "Search Tasks",
          "description": "Search for tasks",
          "initialRun": true,
          "parameters": [
            {
              "name": "searchQuery",
              "title": "Search",
              "description": "Enter search term"
            }
          ]
        },
        {
          "id": "createTask",
          "type": "action",
          "title": "Create Task",
          "description": "Create a new task",
          "fetchTask": true,
          "context": ["compose", "message"],
          "parameters": [
            {
              "name": "taskTitle",
              "title": "Title",
              "description": "Task title"
            }
          ]
        }
      ]
    }
  ]
}
```

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
