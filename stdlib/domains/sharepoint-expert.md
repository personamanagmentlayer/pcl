---
description: Expert in SharePoint Server and SharePoint Online, site collections, lists and libraries, workflows, SharePoint Framework (SPFx), and PnP patterns
keywords: [sharepoint, spfx, sharepoint-framework, pnp, sharepoint-online, site-collections, content-types, workflows]
category: domains
expertise_level: expert
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

## Implementation Examples

### SPFx Web Part with React

```typescript
// HelloWorldWebPart.ts
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneCheckbox
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import HelloWorld from './components/HelloWorld';
import { IHelloWorldProps } from './components/IHelloWorldProps';

export interface IHelloWorldWebPartProps {
  description: string;
  showWelcome: boolean;
  listName: string;
}

export default class HelloWorldWebPart extends BaseClientSideWebPart<IHelloWorldWebPartProps> {

  public render(): void {
    const element: React.ReactElement<IHelloWorldProps> = React.createElement(
      HelloWorld,
      {
        description: this.properties.description,
        showWelcome: this.properties.showWelcome,
        listName: this.properties.listName,
        context: this.context,
        siteUrl: this.context.pageContext.web.absoluteUrl
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: 'Configure web part settings'
          },
          groups: [
            {
              groupName: 'Basic Settings',
              groupFields: [
                PropertyPaneTextField('description', {
                  label: 'Description'
                }),
                PropertyPaneCheckbox('showWelcome', {
                  text: 'Show welcome message'
                }),
                PropertyPaneTextField('listName', {
                  label: 'List Name'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
```

```typescript
// HelloWorld.tsx
import * as React from 'react';
import { IHelloWorldProps } from './IHelloWorldProps';
import { sp } from '@pnp/sp/presets/all';
import { DetailsList, SelectionMode, IColumn } from '@fluentui/react';

interface IHelloWorldState {
  items: any[];
  loading: boolean;
  error: string;
}

export default class HelloWorld extends React.Component<IHelloWorldProps, IHelloWorldState> {

  private columns: IColumn[] = [
    {
      key: 'title',
      name: 'Title',
      fieldName: 'Title',
      minWidth: 100,
      maxWidth: 200,
      isResizable: true
    },
    {
      key: 'modified',
      name: 'Modified',
      fieldName: 'Modified',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true
    }
  ];

  constructor(props: IHelloWorldProps) {
    super(props);

    this.state = {
      items: [],
      loading: true,
      error: null
    };

    // Initialize PnP JS
    sp.setup({
      spfxContext: this.props.context
    });
  }

  public componentDidMount(): void {
    this.loadItems();
  }

  private async loadItems(): Promise<void> {
    try {
      const items = await sp.web.lists
        .getByTitle(this.props.listName)
        .items
        .select('Id', 'Title', 'Modified')
        .top(50)
        .get();

      this.setState({
        items: items,
        loading: false
      });
    } catch (error) {
      this.setState({
        error: error.message,
        loading: false
      });
    }
  }

  public render(): React.ReactElement<IHelloWorldProps> {
    const { loading, items, error } = this.state;

    return (
      <div className="hello-world">
        {this.props.showWelcome && (
          <div className="welcome-message">
            <h2>Welcome to SharePoint!</h2>
            <p>{this.props.description}</p>
          </div>
        )}

        {loading && <div>Loading items...</div>}

        {error && (
          <div className="error-message">
            Error loading items: {error}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <DetailsList
            items={items}
            columns={this.columns}
            selectionMode={SelectionMode.none}
            setKey="set"
            layoutMode={0}
            isHeaderVisible={true}
          />
        )}

        {!loading && !error && items.length === 0 && (
          <div>No items found in the list.</div>
        )}
      </div>
    );
  }
}
```

### PnP PowerShell Provisioning

```powershell
# Connect to SharePoint Online
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/projectsite" -Interactive

# Create site columns
Add-PnPField -Type Text -InternalName "ProjectCode" -DisplayName "Project Code" -Group "Custom Columns" -Required
Add-PnPField -Type Choice -InternalName "ProjectStatus" -DisplayName "Project Status" -Group "Custom Columns" -Choices "Planning","Active","On Hold","Completed" -Required
Add-PnPField -Type DateTime -InternalName "ProjectStartDate" -DisplayName "Start Date" -Group "Custom Columns"
Add-PnPField -Type User -InternalName "ProjectManager" -DisplayName "Project Manager" -Group "Custom Columns"

# Create content type
Add-PnPContentType -Name "Project Document" -Group "Custom Content Types"

# Add fields to content type
Add-PnPFieldToContentType -Field "ProjectCode" -ContentType "Project Document"
Add-PnPFieldToContentType -Field "ProjectStatus" -ContentType "Project Document"
Add-PnPFieldToContentType -Field "ProjectStartDate" -ContentType "Project Document"
Add-PnPFieldToContentType -Field "ProjectManager" -ContentType "Project Document"

# Create document library
New-PnPList -Title "Project Documents" -Template DocumentLibrary -Url "ProjectDocuments"

# Add content type to library
Add-PnPContentTypeToList -List "Project Documents" -ContentType "Project Document"

# Remove default content type
Remove-PnPContentTypeFromList -List "Project Documents" -ContentType "Document"

# Create views
$viewFields = @("DocIcon", "LinkFilename", "ProjectCode", "ProjectStatus", "ProjectManager", "Modified")
Add-PnPView -List "Project Documents" -Title "Active Projects" -Fields $viewFields -Query "<Where><Eq><FieldRef Name='ProjectStatus'/><Value Type='Choice'>Active</Value></Eq></Where>"

# Set permissions
Break-PnPListInheritance -Identity "Project Documents" -CopyRoleAssignments
Set-PnPListPermission -Identity "Project Documents" -User "projectmanagers@contoso.com" -AddRole "Edit"
Set-PnPListPermission -Identity "Project Documents" -User "projectteam@contoso.com" -AddRole "Contribute"

# Apply site template
Apply-PnPProvisioningTemplate -Path ".\project-site-template.xml"

# Create navigation
Add-PnPNavigationNode -Location QuickLaunch -Title "Project Documents" -Url "ProjectDocuments"
Add-PnPNavigationNode -Location QuickLaunch -Title "Project Tasks" -Url "Lists/ProjectTasks"

# Enable features
Enable-PnPFeature -Identity "DocumentManagement" -Scope Site
Enable-PnPFeature -Identity "Workflows" -Scope Web
```

### REST API Operations (JavaScript)

```javascript
// SharePoint REST API Service
class SharePointService {
    constructor(siteUrl) {
        this.siteUrl = siteUrl;
        this.baseUrl = `${siteUrl}/_api`;
    }

    // Get request digest for POST operations
    async getRequestDigest() {
        const response = await fetch(`${this.siteUrl}/_api/contextinfo`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json;odata=verbose'
            },
            credentials: 'same-origin'
        });

        const data = await response.json();
        return data.d.GetContextWebInformation.FormDigestValue;
    }

    // Get list items
    async getListItems(listTitle, select = '*', filter = '', orderBy = '', top = 100) {
        let url = `${this.baseUrl}/web/lists/getbytitle('${listTitle}')/items?`;

        if (select) url += `$select=${select}&`;
        if (filter) url += `$filter=${filter}&`;
        if (orderBy) url += `$orderby=${orderBy}&`;
        if (top) url += `$top=${top}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json;odata=verbose'
            },
            credentials: 'same-origin'
        });

        const data = await response.json();
        return data.d.results;
    }

    // Create list item
    async createListItem(listTitle, itemProperties) {
        const digest = await this.getRequestDigest();

        // Get list item type
        const listResponse = await fetch(
            `${this.baseUrl}/web/lists/getbytitle('${listTitle}')`,
            {
                method: 'GET',
                headers: { 'Accept': 'application/json;odata=verbose' },
                credentials: 'same-origin'
            }
        );
        const listData = await listResponse.json();
        const itemType = listData.d.ListItemEntityTypeFullName;

        // Create item
        const response = await fetch(
            `${this.baseUrl}/web/lists/getbytitle('${listTitle}')/items`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json;odata=verbose',
                    'Content-Type': 'application/json;odata=verbose',
                    'X-RequestDigest': digest
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    '__metadata': { 'type': itemType },
                    ...itemProperties
                })
            }
        );

        const data = await response.json();
        return data.d;
    }

    // Update list item
    async updateListItem(listTitle, itemId, itemProperties) {
        const digest = await this.getRequestDigest();

        // Get item type
        const listResponse = await fetch(
            `${this.baseUrl}/web/lists/getbytitle('${listTitle}')`,
            {
                method: 'GET',
                headers: { 'Accept': 'application/json;odata=verbose' },
                credentials: 'same-origin'
            }
        );
        const listData = await listResponse.json();
        const itemType = listData.d.ListItemEntityTypeFullName;

        // Update item
        await fetch(
            `${this.baseUrl}/web/lists/getbytitle('${listTitle}')/items(${itemId})`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json;odata=verbose',
                    'Content-Type': 'application/json;odata=verbose',
                    'X-RequestDigest': digest,
                    'IF-MATCH': '*',
                    'X-HTTP-Method': 'MERGE'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    '__metadata': { 'type': itemType },
                    ...itemProperties
                })
            }
        );

        return { success: true };
    }

    // Delete list item
    async deleteListItem(listTitle, itemId) {
        const digest = await this.getRequestDigest();

        await fetch(
            `${this.baseUrl}/web/lists/getbytitle('${listTitle}')/items(${itemId})`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json;odata=verbose',
                    'X-RequestDigest': digest,
                    'IF-MATCH': '*',
                    'X-HTTP-Method': 'DELETE'
                },
                credentials: 'same-origin'
            }
        );

        return { success: true };
    }

    // Upload file
    async uploadFile(libraryTitle, fileName, fileContent) {
        const digest = await this.getRequestDigest();

        const response = await fetch(
            `${this.baseUrl}/web/GetFolderByServerRelativeUrl('${libraryTitle}')/Files/add(url='${fileName}',overwrite=true)`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json;odata=verbose',
                    'X-RequestDigest': digest
                },
                credentials: 'same-origin',
                body: fileContent
            }
        );

        const data = await response.json();
        return data.d;
    }

    // Search
    async search(queryText, selectProperties = '*', rowLimit = 50) {
        const url = `${this.baseUrl}/search/query?querytext='${encodeURIComponent(queryText)}'&selectproperties='${selectProperties}'&rowlimit=${rowLimit}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json;odata=verbose'
            },
            credentials: 'same-origin'
        });

        const data = await response.json();
        return data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results;
    }
}

// Usage
const sp = new SharePointService(_spPageContextInfo.webAbsoluteUrl);

// Get items
const items = await sp.getListItems('Projects', 'Id,Title,ProjectStatus', 'ProjectStatus eq \'Active\'');

// Create item
const newItem = await sp.createListItem('Projects', {
    Title: 'New Project',
    ProjectStatus: 'Planning',
    ProjectCode: 'PROJ-001'
});

// Update item
await sp.updateListItem('Projects', newItem.Id, {
    ProjectStatus: 'Active'
});

// Delete item
await sp.deleteListItem('Projects', newItem.Id);
```

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
