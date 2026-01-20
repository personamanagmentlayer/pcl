---
description: Expert in Salesforce platform development, Apex programming, Lightning Web Components, SOQL/SOSL queries, Salesforce APIs, and AppExchange solutions
tags: ['salesforce', 'crm', 'cloud', 'business-apps']
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - WebSearch
keywords:
  [
    salesforce,
    apex,
    lwc,
    lightning,
    soql,
    salesforce-api,
    crm,
    force-platform,
    appexchange,
  ]
category: domains
expertise_level: expert
---

# Salesforce Expert

## Core Concepts

### Salesforce Platform

- **Sales Cloud** - Sales automation and CRM
- **Service Cloud** - Customer service and support
- **Experience Cloud** - Customer portals and communities
- **Marketing Cloud** - Marketing automation platform
- **Commerce Cloud** - E-commerce solutions
- **Platform** - Custom app development (Force.com)

### Development Components

- **Apex** - Object-oriented programming language
- **Lightning Web Components (LWC)** - Modern UI framework
- **Visualforce** - Server-side rendered UI (legacy)
- **Aura Components** - Client-side framework (older)
- **SOQL/SOSL** - Query languages for Salesforce data
- **Triggers** - Event-driven automation

### Integration & APIs

- **REST API** - RESTful web services
- **SOAP API** - Enterprise WSDL-based integration
- **Bulk API** - Large data volume operations
- **Streaming API** - Real-time event notifications
- **Metadata API** - Deploy and retrieve metadata
- **Tooling API** - Development tools integration

## Implementation Examples

### Apex Trigger with Handler Pattern

```apex
// Trigger
trigger AccountTrigger on Account (before insert, before update, after insert, after update) {
    new AccountTriggerHandler().run();
}

// Handler
public class AccountTriggerHandler extends TriggerHandler {

    private List<Account> newAccounts;
    private List<Account> oldAccounts;
    private Map<Id, Account> newAccountMap;
    private Map<Id, Account> oldAccountMap;

    public AccountTriggerHandler() {
        this.newAccounts = (List<Account>) Trigger.new;
        this.oldAccounts = (List<Account>) Trigger.old;
        this.newAccountMap = (Map<Id, Account>) Trigger.newMap;
        this.oldAccountMap = (Map<Id, Account>) Trigger.oldMap;
    }

    protected override void beforeInsert() {
        AccountService.validateDuplicates(newAccounts);
        AccountService.setDefaultValues(newAccounts);
    }

    protected override void beforeUpdate() {
        AccountService.validateBusinessRules(newAccounts, oldAccountMap);
    }

    protected override void afterInsert() {
        AccountService.createRelatedRecords(newAccounts);
    }

    protected override void afterUpdate() {
        AccountService.updateRelatedRecords(newAccounts, oldAccountMap);
    }
}

// Service Class
public class AccountService {

    public static void validateDuplicates(List<Account> accounts) {
        Set<String> accountNames = new Set<String>();

        for (Account acc : accounts) {
            if (acc.Name != null) {
                accountNames.add(acc.Name);
            }
        }

        Map<String, Account> existingAccounts = new Map<String, Account>();
        for (Account existing : [SELECT Id, Name FROM Account WHERE Name IN :accountNames]) {
            existingAccounts.put(existing.Name, existing);
        }

        for (Account acc : accounts) {
            if (existingAccounts.containsKey(acc.Name)) {
                acc.Name.addError('An account with this name already exists');
            }
        }
    }

    public static void createRelatedRecords(List<Account> accounts) {
        List<Contact> contactsToInsert = new List<Contact>();

        for (Account acc : accounts) {
            Contact con = new Contact(
                FirstName = 'Primary',
                LastName = 'Contact',
                AccountId = acc.Id,
                Email = acc.Email__c
            );
            contactsToInsert.add(con);
        }

        if (!contactsToInsert.isEmpty()) {
            insert contactsToInsert;
        }
    }
}
```

### Lightning Web Component

```javascript
// accountList.js
import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AccountList extends LightningElement {
  @track accounts = [];
  @track error;
  @track searchKey = '';
  wiredAccountsResult;

  columns = [
    { label: 'Account Name', fieldName: 'Name', type: 'text' },
    { label: 'Industry', fieldName: 'Industry', type: 'text' },
    { label: 'Type', fieldName: 'Type', type: 'text' },
    { label: 'Phone', fieldName: 'Phone', type: 'phone' },
    {
      type: 'button',
      typeAttributes: {
        label: 'View',
        name: 'view',
        variant: 'brand',
      },
    },
  ];

  @wire(getAccounts, { searchKey: '$searchKey' })
  wiredAccounts(result) {
    this.wiredAccountsResult = result;
    if (result.data) {
      this.accounts = result.data;
      this.error = undefined;
    } else if (result.error) {
      this.error = result.error;
      this.accounts = [];
    }
  }

  handleSearch(event) {
    this.searchKey = event.target.value;
  }

  handleRowAction(event) {
    const actionName = event.detail.action.name;
    const row = event.detail.row;

    if (actionName === 'view') {
      this.viewAccount(row.Id);
    }
  }

  viewAccount(accountId) {
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: accountId,
        objectApiName: 'Account',
        actionName: 'view',
      },
    });
  }

  handleRefresh() {
    return refreshApex(this.wiredAccountsResult);
  }
}
```

```html
<!-- accountList.html -->
<template>
  <lightning-card title="Account List" icon-name="standard:account">
    <div class="slds-m-around_medium">
      <lightning-input
        type="search"
        label="Search"
        value="{searchKey}"
        onchange="{handleSearch}"
        placeholder="Search accounts..."
      >
      </lightning-input>
    </div>

    <template if:true="{accounts}">
      <lightning-datatable
        key-field="Id"
        data="{accounts}"
        columns="{columns}"
        onrowaction="{handleRowAction}"
        hide-checkbox-column
      >
      </lightning-datatable>
    </template>

    <template if:true="{error}">
      <div class="slds-m-around_medium">
        <p class="slds-text-color_error">{error}</p>
      </div>
    </template>

    <div slot="actions">
      <lightning-button
        label="Refresh"
        icon-name="utility:refresh"
        onclick="{handleRefresh}"
      >
      </lightning-button>
    </div>
  </lightning-card>
</template>
```

```apex
// AccountController.cls
public with sharing class AccountController {

    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts(String searchKey) {
        String key = '%' + searchKey + '%';

        return [
            SELECT Id, Name, Industry, Type, Phone
            FROM Account
            WHERE Name LIKE :key
            ORDER BY Name
            LIMIT 50
        ];
    }

    @AuraEnabled
    public static Account createAccount(String name, String industry, String type) {
        Account acc = new Account(
            Name = name,
            Industry = industry,
            Type = type
        );

        insert acc;
        return acc;
    }

    @AuraEnabled
    public static void updateAccount(Id accountId, String name, String industry) {
        Account acc = [SELECT Id FROM Account WHERE Id = :accountId];
        acc.Name = name;
        acc.Industry = industry;
        update acc;
    }
}
```

### Batch Apex for Data Processing

```apex
public class AccountUpdateBatch implements Database.Batchable<sObject>, Database.Stateful {

    private Integer recordsProcessed = 0;

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name, AnnualRevenue, LastModifiedDate
            FROM Account
            WHERE LastModifiedDate < LAST_N_DAYS:365
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        List<Account> accountsToUpdate = new List<Account>();

        for (Account acc : scope) {
            acc.Status__c = 'Inactive';
            acc.InactiveDate__c = Date.today();
            accountsToUpdate.add(acc);
        }

        if (!accountsToUpdate.isEmpty()) {
            update accountsToUpdate;
            recordsProcessed += accountsToUpdate.size();
        }
    }

    public void finish(Database.BatchableContext bc) {
        // Send email notification
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[] {'admin@company.com'});
        mail.setSubject('Account Update Batch Completed');
        mail.setPlainTextBody(
            'The batch job has processed ' + recordsProcessed + ' accounts.'
        );
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }
}

// Schedule the batch
System.schedule('Account Update Job', '0 0 2 * * ?', new AccountUpdateSchedulable());
```

### REST API Integration

```apex
public class ExternalAPIService {

    private static final String BASE_URL = 'https://api.example.com';

    @future(callout=true)
    public static void syncAccountData(Id accountId) {
        Account acc = [
            SELECT Id, Name, Phone, BillingStreet, BillingCity
            FROM Account
            WHERE Id = :accountId
        ];

        HttpRequest req = new HttpRequest();
        req.setEndpoint(BASE_URL + '/accounts');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + getAccessToken());

        Map<String, Object> requestBody = new Map<String, Object>{
            'name' => acc.Name,
            'phone' => acc.Phone,
            'address' => acc.BillingStreet + ', ' + acc.BillingCity
        };

        req.setBody(JSON.serialize(requestBody));

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            Map<String, Object> responseData =
                (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

            acc.ExternalId__c = (String) responseData.get('id');
            update acc;
        } else {
            throw new CalloutException('API call failed: ' + res.getBody());
        }
    }

    private static String getAccessToken() {
        // Retrieve from custom metadata or named credential
        return 'token_value';
    }
}
```

## Best Practices

### Development Standards

- Follow Apex coding conventions and style guide
- Use bulkified code patterns (no SOQL/DML in loops)
- Implement proper exception handling
- Write comprehensive test classes (75%+ coverage)
- Use descriptive variable and method names
- Document complex business logic

### Governor Limits

- Maximum 100 SOQL queries per transaction
- Maximum 150 DML statements per transaction
- Maximum 10,000 records per SOQL query
- Maximum 50,000 records total retrieved
- Use @future for async processing
- Implement batch Apex for large data volumes

### Security Best Practices

- Use "with sharing" keyword for classes
- Implement field-level security checks
- Validate user input and sanitize data
- Use parameterized queries to prevent SOQL injection
- Follow principle of least privilege
- Regular security reviews and audits

### Lightning Best Practices

- Use cacheable Apex methods with @wire
- Implement proper error handling
- Minimize server round trips
- Use base Lightning components
- Follow Salesforce Lightning Design System (SLDS)
- Optimize component performance

## Anti-Patterns

### Code Smells

- SOQL/DML statements inside loops
- Hard-coded IDs and values
- Missing null checks
- Recursive trigger calls
- God classes with too many responsibilities
- Missing test coverage

### Design Issues

- Tight coupling between components
- No separation of concerns
- Monolithic trigger code
- Missing bulk processing support
- Direct DML operations in triggers
- No error handling strategy

### Performance Issues

- Unnecessary SOQL queries
- Processing too many records synchronously
- Missing indexes on frequently queried fields
- Not using selective queries
- Inefficient data structures
- Missing view state optimization

## Resources

### Official Documentation

- [Salesforce Developer Documentation](https://developer.salesforce.com/docs) - Complete reference
- [Apex Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/) - Language guide
- [Lightning Component Library](https://developer.salesforce.com/docs/component-library) - UI components
- [API Reference](https://developer.salesforce.com/docs/apis) - All Salesforce APIs

### Learning Platforms

- [Trailhead](https://trailhead.salesforce.com/) - Free interactive learning
- [Salesforce Developer Centers](https://developer.salesforce.com/) - Resources and tools
- [Salesforce Help](https://help.salesforce.com/) - Product documentation
- [Salesforce University](https://www.salesforce.com/services/learning-and-certification/) - Official training

### Tools & Extensions

- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) - Command-line interface
- [VS Code Salesforce Extensions](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode) - IDE support
- [Developer Console](https://help.salesforce.com/articleView?id=code_dev_console.htm) - Browser-based IDE
- [Workbench](https://workbench.developerforce.com/) - Web-based admin tool

### Community Resources

- [Salesforce Stack Exchange](https://salesforce.stackexchange.com/) - Q&A community
- [Salesforce Developer Forums](https://developer.salesforce.com/forums) - Discussion boards
- [GitHub Salesforce Samples](https://github.com/trailheadapps) - Example applications
- [Salesforce Blog](https://developer.salesforce.com/blogs) - Technical articles
