---
description: Expert in Microsoft 365 ecosystem, Power Platform, SharePoint Online, Microsoft Teams, Graph API, and Microsoft 365 administration
keywords: [microsoft365, m365, power-platform, sharepoint, teams, graph-api, powerapps, power-automate, office365]
category: domains
expertise_level: expert
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

## Implementation Examples

### Microsoft Graph API Integration

```typescript
// TypeScript/Node.js Graph API Client
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

class GraphAPIService {
    private client: Client;

    constructor(tenantId: string, clientId: string, clientSecret: string) {
        const credential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret
        );

        this.client = Client.initWithMiddleware({
            authProvider: {
                getAccessToken: async () => {
                    const token = await credential.getToken(
                        'https://graph.microsoft.com/.default'
                    );
                    return token.token;
                }
            }
        });
    }

    // Get user information
    async getUser(userId: string) {
        try {
            const user = await this.client
                .api(`/users/${userId}`)
                .select('displayName,mail,jobTitle,department')
                .get();

            return user;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    // List user's emails
    async listEmails(userId: string, top: number = 10) {
        try {
            const messages = await this.client
                .api(`/users/${userId}/messages`)
                .top(top)
                .select('subject,from,receivedDateTime,isRead')
                .orderby('receivedDateTime desc')
                .get();

            return messages.value;
        } catch (error) {
            console.error('Error listing emails:', error);
            throw error;
        }
    }

    // Send email
    async sendEmail(userId: string, to: string, subject: string, body: string) {
        const message = {
            message: {
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: body
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to
                        }
                    }
                ]
            }
        };

        try {
            await this.client
                .api(`/users/${userId}/sendMail`)
                .post(message);

            return { success: true };
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Create Teams meeting
    async createTeamsMeeting(userId: string, subject: string, startTime: Date, endTime: Date) {
        const meeting = {
            subject: subject,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'UTC'
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'UTC'
            },
            isOnlineMeeting: true,
            onlineMeetingProvider: 'teamsForBusiness'
        };

        try {
            const event = await this.client
                .api(`/users/${userId}/calendar/events`)
                .post(meeting);

            return event;
        } catch (error) {
            console.error('Error creating meeting:', error);
            throw error;
        }
    }

    // Upload file to SharePoint
    async uploadFileToSharePoint(
        siteId: string,
        driveId: string,
        fileName: string,
        fileContent: Buffer
    ) {
        try {
            const uploadSession = await this.client
                .api(`/sites/${siteId}/drives/${driveId}/root:/${fileName}:/createUploadSession`)
                .post({});

            // Upload file in chunks (for large files)
            const maxChunkSize = 320 * 1024; // 320 KB
            let offset = 0;

            while (offset < fileContent.length) {
                const chunk = fileContent.slice(offset, offset + maxChunkSize);
                const contentRange = `bytes ${offset}-${offset + chunk.length - 1}/${fileContent.length}`;

                const response = await fetch(uploadSession.uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Range': contentRange,
                        'Content-Length': chunk.length.toString()
                    },
                    body: chunk
                });

                offset += chunk.length;
            }

            return { success: true, fileName };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    // Get Teams channels
    async getTeamsChannels(teamId: string) {
        try {
            const channels = await this.client
                .api(`/teams/${teamId}/channels`)
                .get();

            return channels.value;
        } catch (error) {
            console.error('Error getting channels:', error);
            throw error;
        }
    }

    // Post message to Teams channel
    async postToChannel(teamId: string, channelId: string, message: string) {
        const chatMessage = {
            body: {
                content: message,
                contentType: 'html'
            }
        };

        try {
            const result = await this.client
                .api(`/teams/${teamId}/channels/${channelId}/messages`)
                .post(chatMessage);

            return result;
        } catch (error) {
            console.error('Error posting message:', error);
            throw error;
        }
    }
}

// Usage
const graphService = new GraphAPIService(
    'your-tenant-id',
    'your-client-id',
    'your-client-secret'
);

// Get user
const user = await graphService.getUser('user@domain.com');
console.log('User:', user.displayName);

// Send email
await graphService.sendEmail(
    'user@domain.com',
    'recipient@domain.com',
    'Hello from Graph API',
    '<h1>Hello!</h1><p>This is a test email.</p>'
);
```

### Power Automate Flow (JSON)

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "actions": {
      "Get_file_content": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['sharepointonline']['connectionId']"
            }
          },
          "method": "get",
          "path": "/datasets/@{encodeURIComponent(encodeURIComponent('https://contoso.sharepoint.com/sites/hr'))}/files/@{encodeURIComponent(triggerBody()?['{Identifier}'])}/content"
        },
        "runAfter": {}
      },
      "Parse_JSON": {
        "type": "ParseJson",
        "inputs": {
          "content": "@body('Get_file_content')",
          "schema": {
            "type": "object",
            "properties": {
              "employeeId": { "type": "string" },
              "name": { "type": "string" },
              "department": { "type": "string" },
              "startDate": { "type": "string" }
            }
          }
        },
        "runAfter": {
          "Get_file_content": ["Succeeded"]
        }
      },
      "Create_item": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['sharepointonline']['connectionId']"
            }
          },
          "method": "post",
          "body": {
            "Title": "@body('Parse_JSON')?['name']",
            "EmployeeId": "@body('Parse_JSON')?['employeeId']",
            "Department": "@body('Parse_JSON')?['department']",
            "StartDate": "@body('Parse_JSON')?['startDate']"
          },
          "path": "/datasets/@{encodeURIComponent(encodeURIComponent('https://contoso.sharepoint.com/sites/hr'))}/tables/@{encodeURIComponent(encodeURIComponent('Employees'))}/items"
        },
        "runAfter": {
          "Parse_JSON": ["Succeeded"]
        }
      },
      "Send_an_email": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['office365']['connectionId']"
            }
          },
          "method": "post",
          "body": {
            "To": "hr@contoso.com",
            "Subject": "New Employee Added: @{body('Parse_JSON')?['name']}",
            "Body": "<p>A new employee has been added to the system:</p><ul><li>Name: @{body('Parse_JSON')?['name']}</li><li>Department: @{body('Parse_JSON')?['department']}</li><li>Start Date: @{body('Parse_JSON')?['startDate']}</li></ul>",
            "Importance": "Normal"
          },
          "path": "/v2/Mail"
        },
        "runAfter": {
          "Create_item": ["Succeeded"]
        }
      },
      "Post_message_in_Teams": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['teams']['connectionId']"
            }
          },
          "method": "post",
          "body": {
            "messageBody": "New employee onboarded: @{body('Parse_JSON')?['name']} in @{body('Parse_JSON')?['department']}"
          },
          "path": "/v3/beta/teams/@{encodeURIComponent('team-id')}/channels/@{encodeURIComponent('channel-id')}/messages"
        },
        "runAfter": {
          "Send_an_email": ["Succeeded"]
        }
      }
    },
    "triggers": {
      "When_a_file_is_created": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['sharepointonline']['connectionId']"
            }
          },
          "method": "get",
          "path": "/datasets/@{encodeURIComponent(encodeURIComponent('https://contoso.sharepoint.com/sites/hr'))}/triggers/onnewfile",
          "queries": {
            "folderId": "Shared Documents/NewEmployees"
          }
        },
        "recurrence": {
          "frequency": "Minute",
          "interval": 5
        }
      }
    }
  }
}
```

### PowerShell SharePoint Management

```powershell
# Connect to SharePoint Online
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/hr" -Interactive

# Create new list
New-PnPList -Title "Employees" -Template GenericList

# Add fields to list
Add-PnPField -List "Employees" -DisplayName "Employee ID" -InternalName "EmployeeId" -Type Text -Required
Add-PnPField -List "Employees" -DisplayName "Department" -InternalName "Department" -Type Choice -Choices "HR","IT","Sales","Marketing"
Add-PnPField -List "Employees" -DisplayName "Start Date" -InternalName "StartDate" -Type DateTime

# Add list items
Add-PnPListItem -List "Employees" -Values @{
    "Title" = "John Doe"
    "EmployeeId" = "EMP001"
    "Department" = "IT"
    "StartDate" = (Get-Date)
}

# Query list items
$items = Get-PnPListItem -List "Employees" -Query "<View><Query><Where><Eq><FieldRef Name='Department'/><Value Type='Choice'>IT</Value></Eq></Where></Query></View>"

foreach ($item in $items) {
    Write-Host "Employee: $($item['Title']), ID: $($item['EmployeeId'])"
}

# Upload files
Add-PnPFile -Path "C:\Documents\employee-handbook.pdf" -Folder "Shared Documents"

# Set permissions
Set-PnPListPermission -Identity "Employees" -User "user@contoso.com" -AddRole "Contribute"

# Create site
New-PnPSite -Type TeamSite -Title "Project Alpha" -Alias "projectalpha"

# Provision site template
Invoke-PnPSiteTemplate -Path ".\site-template.xml"

# Export site template
Get-PnPSiteTemplate -Out ".\site-template.xml" -IncludeAllPages

# Manage users
Add-PnPSiteCollectionAdmin -Owners "admin@contoso.com"
Remove-PnPSiteCollectionAdmin -Owners "oldadmin@contoso.com"

# Create Teams team
$team = New-PnPTeamsTeam -DisplayName "Project Alpha Team" -Visibility Private

# Add channels to team
Add-PnPTeamsChannel -Team $team.GroupId -DisplayName "General Discussion"
Add-PnPTeamsChannel -Team $team.GroupId -DisplayName "Development"

# Add members to team
Add-PnPTeamsUser -Team $team.GroupId -User "user@contoso.com" -Role Member
```

### Power Apps Formula Examples

```javascript
// Power Apps formulas for canvas app

// Filter gallery based on search box
Filter(
    Employees,
    Or(
        StartsWith(Title, TextSearchBox.Text),
        StartsWith(EmployeeId, TextSearchBox.Text),
        StartsWith(Department, TextSearchBox.Text)
    )
)

// Create new item in SharePoint list
Patch(
    Employees,
    Defaults(Employees),
    {
        Title: TextInput_Name.Text,
        EmployeeId: TextInput_EmpId.Text,
        Department: Dropdown_Dept.Selected.Value,
        StartDate: DatePicker_Start.SelectedDate,
        Salary: Value(TextInput_Salary.Text)
    }
)

// Update existing item
Patch(
    Employees,
    Gallery_Employees.Selected,
    {
        Title: TextInput_Name.Text,
        Department: Dropdown_Dept.Selected.Value
    }
)

// Delete item
Remove(Employees, Gallery_Employees.Selected)

// Complex formula with conditions
If(
    IsBlank(TextInput_Name.Text),
    Notify("Please enter a name", NotificationType.Error),
    If(
        CountRows(Filter(Employees, EmployeeId = TextInput_EmpId.Text)) > 0,
        Notify("Employee ID already exists", NotificationType.Warning),
        // Create employee
        Patch(Employees, Defaults(Employees), {...});
        Notify("Employee created successfully", NotificationType.Success);
        ResetForm(Form_Employee)
    )
)

// Calculate total salary by department
GroupBy(
    Employees,
    "Department",
    "DeptGroup"
) As DeptData,
AddColumns(
    DeptData,
    "TotalSalary",
    Sum(DeptGroup, Salary),
    "AvgSalary",
    Average(DeptGroup, Salary),
    "Count",
    CountRows(DeptGroup)
)

// Navigate with context
Navigate(
    Screen_EmployeeDetail,
    ScreenTransition.Fade,
    {
        SelectedEmployee: Gallery_Employees.Selected
    }
)
```

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
