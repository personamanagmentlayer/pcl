# Dynamics 365 Expert — Implementation Examples

Reference material for the `dynamics365-expert` skill. See [SKILL.md](../SKILL.md).

## Implementation Examples

### Plugin Development (C#)

```csharp
using System;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace CustomPlugins
{
    /// <summary>
    /// Account Creation Plugin
    /// Executes on Create of Account entity
    /// </summary>
    public class AccountCreationPlugin : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            // Obtain the execution context
            IPluginExecutionContext context = (IPluginExecutionContext)
                serviceProvider.GetService(typeof(IPluginExecutionContext));

            // Obtain the organization service
            IOrganizationServiceFactory serviceFactory =
                (IOrganizationServiceFactory)serviceProvider.GetService(
                    typeof(IOrganizationServiceFactory));

            IOrganizationService service =
                serviceFactory.CreateOrganizationService(context.UserId);

            // Obtain the tracing service
            ITracingService tracingService = (ITracingService)
                serviceProvider.GetService(typeof(ITracingService));

            try
            {
                // Validate context
                if (context.InputParameters.Contains("Target") &&
                    context.InputParameters["Target"] is Entity)
                {
                    Entity account = (Entity)context.InputParameters["Target"];

                    tracingService.Trace("Account Creation Plugin: Processing account {0}",
                        account.Id);

                    // Validate required fields
                    ValidateRequiredFields(account, tracingService);

                    // Set default values
                    SetDefaultValues(account, tracingService);

                    // Create related records
                    if (context.Stage == 40) // Post-operation
                    {
                        CreateRelatedRecords(service, account, tracingService);
                    }

                    // Send notifications
                    SendNotifications(service, account, tracingService);
                }
            }
            catch (FaultException<OrganizationServiceFault> ex)
            {
                tracingService.Trace("Error: {0}", ex.ToString());
                throw new InvalidPluginExecutionException(
                    "An error occurred in the Account Creation Plugin.", ex);
            }
            catch (Exception ex)
            {
                tracingService.Trace("Error: {0}", ex.ToString());
                throw;
            }
        }

        private void ValidateRequiredFields(Entity account, ITracingService tracingService)
        {
            tracingService.Trace("Validating required fields");

            if (!account.Contains("name") || string.IsNullOrEmpty(account["name"].ToString()))
            {
                throw new InvalidPluginExecutionException("Account name is required.");
            }

            if (!account.Contains("telephone1"))
            {
                throw new InvalidPluginExecutionException("Phone number is required.");
            }
        }

        private void SetDefaultValues(Entity account, ITracingService tracingService)
        {
            tracingService.Trace("Setting default values");

            // Set account number if not provided
            if (!account.Contains("accountnumber"))
            {
                account["accountnumber"] = GenerateAccountNumber();
            }

            // Set default industry
            if (!account.Contains("industrycode"))
            {
                account["industrycode"] = new OptionSetValue(1); // Default industry
            }

            // Set account rating based on revenue
            if (account.Contains("revenue"))
            {
                Money revenue = (Money)account["revenue"];
                if (revenue.Value > 1000000)
                {
                    account["accountratingcode"] = new OptionSetValue(1); // Hot
                }
                else if (revenue.Value > 100000)
                {
                    account["accountratingcode"] = new OptionSetValue(2); // Warm
                }
                else
                {
                    account["accountratingcode"] = new OptionSetValue(3); // Cold
                }
            }
        }

        private void CreateRelatedRecords(IOrganizationService service,
            Entity account, ITracingService tracingService)
        {
            tracingService.Trace("Creating related records");

            // Create default contact
            Entity contact = new Entity("contact");
            contact["firstname"] = "Primary";
            contact["lastname"] = "Contact";
            contact["parentcustomerid"] = new EntityReference("account", account.Id);

            if (account.Contains("telephone1"))
            {
                contact["telephone1"] = account["telephone1"];
            }

            if (account.Contains("emailaddress1"))
            {
                contact["emailaddress1"] = account["emailaddress1"];
            }

            Guid contactId = service.Create(contact);
            tracingService.Trace("Created contact with ID: {0}", contactId);

            // Create opportunity
            Entity opportunity = new Entity("opportunity");
            opportunity["name"] = account["name"] + " - Initial Opportunity";
            opportunity["customerid"] = new EntityReference("account", account.Id);
            opportunity["estimatedvalue"] = new Money(50000);
            opportunity["stepname"] = "1-Qualify";

            Guid opportunityId = service.Create(opportunity);
            tracingService.Trace("Created opportunity with ID: {0}", opportunityId);
        }

        private void SendNotifications(IOrganizationService service,
            Entity account, ITracingService tracingService)
        {
            tracingService.Trace("Sending notifications");

            // Query for sales managers
            QueryExpression query = new QueryExpression("systemuser");
            query.ColumnSet = new ColumnSet("internalemailaddress");
            query.Criteria.AddCondition("businessunitid",
                ConditionOperator.Equal, account["owningbusinessunit"]);

            EntityCollection users = service.RetrieveMultiple(query);

            foreach (Entity user in users.Entities)
            {
                // Send email notification (simplified)
                Entity email = new Entity("email");
                email["subject"] = "New Account Created: " + account["name"];
                email["description"] = "A new account has been created in the system.";

                Entity toParty = new Entity("activityparty");
                toParty["partyid"] = new EntityReference("systemuser", user.Id);

                email["to"] = new Entity[] { toParty };

                service.Create(email);
            }

            tracingService.Trace("Notifications sent");
        }

        private string GenerateAccountNumber()
        {
            return "ACC-" + DateTime.Now.ToString("yyyyMMddHHmmss");
        }
    }
}
```

### JavaScript Web Resource

```javascript
// Account Form Script
var AccountForm = AccountForm || {};

(function () {
  'use strict';

  // Form OnLoad event
  this.OnLoad = function (executionContext) {
    var formContext = executionContext.getFormContext();

    console.log('Account form loaded');

    // Set field requirements
    setFieldRequirements(formContext);

    // Configure business rules
    configureBusinessRules(formContext);

    // Populate related data
    populateRelatedData(formContext);

    // Add event handlers
    addEventHandlers(formContext);
  };

  // Form OnSave event
  this.OnSave = function (executionContext) {
    var formContext = executionContext.getFormContext();

    console.log('Account form saving');

    // Validate data
    if (!validateForm(formContext)) {
      executionContext.getEventArgs().preventDefault();
      return false;
    }

    // Additional save logic
    performPreSaveOperations(formContext);
  };

  // Field OnChange event
  this.OnRevenueChange = function (executionContext) {
    var formContext = executionContext.getFormContext();
    var revenue = formContext.getAttribute('revenue').getValue();

    if (revenue) {
      // Calculate and set account rating
      var rating;
      if (revenue > 1000000) {
        rating = 1; // Hot
      } else if (revenue > 100000) {
        rating = 2; // Warm
      } else {
        rating = 3; // Cold
      }

      formContext.getAttribute('accountratingcode').setValue(rating);

      // Show/hide sections based on revenue
      if (revenue > 500000) {
        formContext.ui.tabs.get('tab_vip').setVisible(true);
      } else {
        formContext.ui.tabs.get('tab_vip').setVisible(false);
      }
    }
  };

  // Custom button action
  this.CreateOpportunity = function (executionContext) {
    var formContext = executionContext.getFormContext();
    var accountId = formContext.data.entity.getId().replace(/[{}]/g, '');
    var accountName = formContext.getAttribute('name').getValue();

    // Create opportunity record
    var opportunity = {
      name: accountName + ' - New Opportunity',
      'customerid_account@odata.bind': '/accounts(' + accountId + ')',
      estimatedvalue: 50000,
      stepname: '1-Qualify',
    };

    Xrm.WebApi.createRecord('opportunity', opportunity)
      .then(function (result) {
        var opportunityId = result.id;
        console.log('Opportunity created: ' + opportunityId);

        Xrm.Navigation.openForm({
          entityName: 'opportunity',
          entityId: opportunityId,
        }).then(
          function (success) {
            console.log('Opportunity form opened');
          },
          function (error) {
            console.error('Error opening form: ' + error.message);
          }
        );
      })
      .catch(function (error) {
        Xrm.Navigation.openAlertDialog({
          text: 'Error creating opportunity: ' + error.message,
        });
      });
  };

  // Private functions
  function setFieldRequirements(formContext) {
    formContext.getAttribute('name').setRequiredLevel('required');
    formContext.getAttribute('telephone1').setRequiredLevel('required');
    formContext.getAttribute('emailaddress1').setRequiredLevel('recommended');
  }

  function configureBusinessRules(formContext) {
    var accountType = formContext.getAttribute('customertypecode').getValue();

    if (accountType === 3) {
      // Partner
      formContext.getControl('parentaccountid').setVisible(true);
      formContext.getAttribute('parentaccountid').setRequiredLevel('required');
    } else {
      formContext.getControl('parentaccountid').setVisible(false);
      formContext.getAttribute('parentaccountid').setRequiredLevel('none');
    }
  }

  function populateRelatedData(formContext) {
    var accountId = formContext.data.entity.getId().replace(/[{}]/g, '');

    if (accountId) {
      // Retrieve and display contact count
      var fetchXml = [
        "<fetch aggregate='true'>",
        "  <entity name='contact'>",
        "    <attribute name='contactid' aggregate='count' alias='contactcount'/>",
        '    <filter>',
        "      <condition attribute='parentcustomerid' operator='eq' value='" +
          accountId +
          "'/>",
        '    </filter>',
        '  </entity>',
        '</fetch>',
      ].join('');

      Xrm.WebApi.retrieveMultipleRecords(
        'contact',
        '?fetchXml=' + encodeURIComponent(fetchXml)
      )
        .then(function (result) {
          if (result.entities.length > 0) {
            var count = result.entities[0].contactcount;
            formContext.getControl('header_contactcount').setValue(count);
          }
        })
        .catch(function (error) {
          console.error('Error retrieving contacts: ' + error.message);
        });
    }
  }

  function addEventHandlers(formContext) {
    formContext
      .getAttribute('revenue')
      .addOnChange(AccountForm.OnRevenueChange);
    formContext.getAttribute('customertypecode').addOnChange(function () {
      configureBusinessRules(formContext);
    });
  }

  function validateForm(formContext) {
    var isValid = true;
    var messages = [];

    // Validate phone number format
    var phone = formContext.getAttribute('telephone1').getValue();
    if (phone && !isValidPhoneNumber(phone)) {
      messages.push('Please enter a valid phone number.');
      isValid = false;
    }

    // Validate email format
    var email = formContext.getAttribute('emailaddress1').getValue();
    if (email && !isValidEmail(email)) {
      messages.push('Please enter a valid email address.');
      isValid = false;
    }

    if (!isValid) {
      Xrm.Navigation.openAlertDialog({
        text: messages.join('\n'),
      });
    }

    return isValid;
  }

  function performPreSaveOperations(formContext) {
    // Update modified fields
    formContext.getAttribute('new_lastupdated').setValue(new Date());
  }

  function isValidPhoneNumber(phone) {
    var regex = /^[\d\s\-\+\(\)]+$/;
    return regex.test(phone);
  }

  function isValidEmail(email) {
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
}).call(AccountForm);
```

### Power Automate Flow with Dataverse

```json
{
  "definition": {
    "actions": {
      "When_a_record_is_created": {
        "type": "OpenApiConnection",
        "inputs": {
          "host": {
            "connectionName": "shared_commondataserviceforapps",
            "operationId": "SubscribeWebhookTrigger",
            "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
          },
          "parameters": {
            "subscriptionRequest/message": 1,
            "subscriptionRequest/entityname": "account",
            "subscriptionRequest/scope": 4
          }
        }
      },
      "Get_account_details": {
        "type": "OpenApiConnection",
        "inputs": {
          "host": {
            "connectionName": "shared_commondataserviceforapps",
            "operationId": "GetItem",
            "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
          },
          "parameters": {
            "entityName": "accounts",
            "recordId": "@triggerOutputs()?['body/accountid']"
          }
        },
        "runAfter": {
          "When_a_record_is_created": ["Succeeded"]
        }
      },
      "Condition_check_revenue": {
        "type": "If",
        "expression": {
          "and": [
            {
              "greater": [
                "@outputs('Get_account_details')?['body/revenue']",
                1000000
              ]
            }
          ]
        },
        "actions": {
          "Create_high_value_opportunity": {
            "type": "OpenApiConnection",
            "inputs": {
              "host": {
                "connectionName": "shared_commondataserviceforapps",
                "operationId": "CreateRecord",
                "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
              },
              "parameters": {
                "entityName": "opportunities",
                "item": {
                  "name": "@{outputs('Get_account_details')?['body/name']} - Strategic Opportunity",
                  "_customerid_value": "@outputs('Get_account_details')?['body/accountid']",
                  "estimatedvalue": 100000,
                  "stepname": "1-Qualify",
                  "prioritycode": 1
                }
              }
            }
          },
          "Assign_to_senior_sales": {
            "type": "OpenApiConnection",
            "inputs": {
              "host": {
                "connectionName": "shared_commondataserviceforapps",
                "operationId": "UpdateRecord",
                "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
              },
              "parameters": {
                "entityName": "accounts",
                "recordId": "@outputs('Get_account_details')?['body/accountid']",
                "item": {
                  "_ownerid_value": "@parameters('SeniorSalesManagerId')",
                  "accountratingcode": 1
                }
              }
            },
            "runAfter": {
              "Create_high_value_opportunity": ["Succeeded"]
            }
          },
          "Send_notification_email": {
            "type": "OpenApiConnection",
            "inputs": {
              "host": {
                "connectionName": "shared_office365",
                "operationId": "SendEmailV2",
                "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
              },
              "parameters": {
                "emailMessage": {
                  "To": "sales-leadership@company.com",
                  "Subject": "High-Value Account Created",
                  "Body": "<p>A new high-value account has been created:</p><ul><li>Account: @{outputs('Get_account_details')?['body/name']}</li><li>Revenue: $@{outputs('Get_account_details')?['body/revenue']}</li></ul>",
                  "Importance": "High"
                }
              }
            },
            "runAfter": {
              "Assign_to_senior_sales": ["Succeeded"]
            }
          }
        },
        "runAfter": {
          "Get_account_details": ["Succeeded"]
        }
      }
    },
    "triggers": {
      "When_a_record_is_created": {
        "type": "OpenApiConnectionWebhook"
      }
    }
  }
}
```
