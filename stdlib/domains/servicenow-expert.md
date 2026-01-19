---
description: Expert in ServiceNow platform development, scripting, workflows, Service Portal, CMDB, ITSM modules, and integrations
keywords: [servicenow, itsm, cmdb, service-portal, workflow, gliderecord, business-rules, it-service-management]
category: domains
expertise_level: expert
---

# ServiceNow Expert

## Core Concepts

### ServiceNow Platform
- **ITSM** - IT Service Management (Incident, Problem, Change)
- **ITOM** - IT Operations Management
- **ITBM** - IT Business Management
- **CMDB** - Configuration Management Database
- **Service Portal** - User-facing portal interface
- **Flow Designer** - Visual workflow automation

### Development Components
- **Business Rules** - Server-side scripts on table operations
- **Client Scripts** - Client-side validation and logic
- **UI Policies** - Dynamic form behavior
- **Script Includes** - Reusable server-side code libraries
- **Scheduled Jobs** - Automated background tasks
- **Transform Maps** - Data import/integration mapping

### Scripting APIs
- **GlideRecord** - Database query and manipulation
- **GlideAjax** - Asynchronous client-server communication
- **GlideSystem** - System utilities (gs object)
- **GlideDateTime** - Date and time operations
- **GlideUser** - User information and permissions
- **RESTMessageV2** - External API integration

## Implementation Examples

### GlideRecord Query and Update

```javascript
// Business Rule - Update related records
(function executeRule(current, previous /*null when async*/) {

    // Query for related incidents
    var gr = new GlideRecord('incident');
    gr.addQuery('caller_id', current.sys_id);
    gr.addQuery('state', 'IN', '1,2,3'); // New, In Progress, On Hold
    gr.query();

    var incidentCount = 0;
    var incidentNumbers = [];

    while (gr.next()) {
        // Update priority based on user's VIP status
        if (current.vip == true) {
            gr.priority = '1'; // Critical
            gr.update();
            incidentCount++;
            incidentNumbers.push(gr.number.toString());
        }
    }

    // Log activity
    if (incidentCount > 0) {
        gs.addInfoMessage('Updated ' + incidentCount + ' incidents: ' +
                         incidentNumbers.join(', '));
        gs.info('VIP status updated for user ' + current.sys_id +
               ', affected incidents: ' + incidentNumbers.join(', '));
    }

})(current, previous);
```

### Script Include with REST API Integration

```javascript
var ExternalAPIIntegration = Class.create();
ExternalAPIIntegration.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    // Call external API to get user data
    getUserDetails: function(userId) {
        try {
            var request = new sn_ws.RESTMessageV2();
            request.setEndpoint('https://api.example.com/users/' + userId);
            request.setHttpMethod('GET');
            request.setRequestHeader('Accept', 'application/json');
            request.setRequestHeader('Authorization', 'Bearer ' + this._getToken());

            var response = request.execute();
            var httpStatus = response.getStatusCode();

            if (httpStatus == 200) {
                var responseBody = response.getBody();
                var jsonResponse = JSON.parse(responseBody);
                return jsonResponse;
            } else {
                gs.error('API call failed with status: ' + httpStatus);
                return null;
            }

        } catch (ex) {
            gs.error('Exception in getUserDetails: ' + ex.message);
            return null;
        }
    },

    // Sync user from external system
    syncUser: function(userId) {
        var userData = this.getUserDetails(userId);

        if (userData) {
            var gr = new GlideRecord('sys_user');
            gr.addQuery('employee_number', userData.employeeId);
            gr.query();

            if (gr.next()) {
                gr.email = userData.email;
                gr.phone = userData.phone;
                gr.department = this._getDepartmentId(userData.department);
                gr.title = userData.jobTitle;
                gr.update();

                gs.info('User synced successfully: ' + gr.sys_id);
                return gr.sys_id.toString();
            } else {
                gs.warn('User not found in ServiceNow: ' + userData.employeeId);
                return null;
            }
        }

        return null;
    },

    _getToken: function() {
        // Retrieve from system property or credential store
        return gs.getProperty('external.api.token');
    },

    _getDepartmentId: function(deptName) {
        var gr = new GlideRecord('cmn_department');
        gr.addQuery('name', deptName);
        gr.query();

        if (gr.next()) {
            return gr.sys_id.toString();
        }
        return '';
    },

    type: 'ExternalAPIIntegration'
});
```

### Client Script with GlideAjax

```javascript
// Client Script - onChange
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;
    }

    // Call server-side script to validate user
    var ga = new GlideAjax('UserValidationAjax');
    ga.addParam('sysparm_name', 'validateUser');
    ga.addParam('sysparm_user_id', newValue);

    ga.getXMLAnswer(function(answer) {
        var result = JSON.parse(answer);

        if (!result.valid) {
            g_form.showErrorBox('caller_id', result.message);
            g_form.clearValue('caller_id');
        } else {
            // Populate additional fields
            g_form.setValue('caller_phone', result.phone);
            g_form.setValue('caller_email', result.email);

            // Show info message
            g_form.addInfoMessage('User validated: ' + result.name);
        }
    });
}
```

```javascript
// Script Include for GlideAjax
var UserValidationAjax = Class.create();
UserValidationAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    validateUser: function() {
        var userId = this.getParameter('sysparm_user_id');
        var result = {
            valid: false,
            message: ''
        };

        var gr = new GlideRecord('sys_user');
        if (gr.get(userId)) {
            if (!gr.active) {
                result.message = 'User is inactive';
            } else if (gr.locked_out) {
                result.message = 'User account is locked';
            } else {
                result.valid = true;
                result.name = gr.name.toString();
                result.phone = gr.phone.toString();
                result.email = gr.email.toString();
            }
        } else {
            result.message = 'User not found';
        }

        return JSON.stringify(result);
    },

    type: 'UserValidationAjax'
});
```

### Service Portal Widget

```javascript
// Server Script
(function() {
    /* Server-side script */

    data.incidents = [];

    var gr = new GlideRecord('incident');
    gr.addQuery('caller_id', gs.getUserID());
    gr.addQuery('active', true);
    gr.orderByDesc('sys_created_on');
    gr.setLimit(10);
    gr.query();

    while (gr.next()) {
        data.incidents.push({
            number: gr.getValue('number'),
            short_description: gr.getValue('short_description'),
            state: gr.getDisplayValue('state'),
            priority: gr.getDisplayValue('priority'),
            sys_id: gr.getValue('sys_id'),
            sys_created_on: gr.getValue('sys_created_on')
        });
    }

    data.canCreateIncident = gs.hasRole('itil');
})();
```

```html
<!-- HTML Template -->
<div class="panel panel-default">
    <div class="panel-heading">
        <h3 class="panel-title">My Incidents</h3>
    </div>
    <div class="panel-body">
        <div ng-if="data.incidents.length === 0" class="alert alert-info">
            No active incidents found
        </div>

        <table class="table table-striped" ng-if="data.incidents.length > 0">
            <thead>
                <tr>
                    <th>Number</th>
                    <th>Description</th>
                    <th>State</th>
                    <th>Priority</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                <tr ng-repeat="incident in data.incidents">
                    <td>
                        <a href="?id=ticket&table=incident&sys_id={{incident.sys_id}}">
                            {{incident.number}}
                        </a>
                    </td>
                    <td>{{incident.short_description}}</td>
                    <td>{{incident.state}}</td>
                    <td>{{incident.priority}}</td>
                    <td>{{incident.sys_created_on | date:'short'}}</td>
                </tr>
            </tbody>
        </table>

        <button ng-if="data.canCreateIncident"
                class="btn btn-primary"
                ng-click="c.createIncident()">
            Create New Incident
        </button>
    </div>
</div>
```

```javascript
// Client Controller
function($scope, spModal) {
    var c = this;

    c.createIncident = function() {
        spModal.open({
            title: 'Create Incident',
            widget: 'widget-sc-cat-item',
            widgetInput: {
                sys_id: 'incident_form_sys_id'
            }
        }).then(function(response) {
            // Refresh widget after creation
            c.server.refresh();
        });
    };
}
```

### Flow Designer Action

```javascript
// Script step in Flow Designer
(function execute(inputs, outputs) {

    var incidentId = inputs.incident_id;
    var gr = new GlideRecord('incident');

    if (gr.get(incidentId)) {
        // Calculate business hours since creation
        var schedule = new GlideSchedule();
        var scheduleId = gr.assignment_group.schedule.toString();

        if (scheduleId) {
            schedule.load(scheduleId);
        } else {
            // Default to 24x7
            schedule.load('08fcd0930a0a0b00079c3ee8a4efc9ba');
        }

        var createdDate = gr.sys_created_on.getGlideObject();
        var currentDate = new GlideDateTime();

        var duration = schedule.duration(createdDate, currentDate);
        var hours = duration.getDurationValue() / 3600; // Convert to hours

        outputs.business_hours = hours;
        outputs.is_sla_breach = hours > 24; // SLA is 24 hours

        // Update incident
        gr.u_business_hours_open = hours;
        gr.update();

    } else {
        outputs.business_hours = 0;
        outputs.is_sla_breach = false;
        gs.error('Incident not found: ' + incidentId);
    }

})(inputs, outputs);
```

## Best Practices

### Development Standards
- Follow ServiceNow coding best practices
- Use Script Includes for reusable code
- Implement proper error handling
- Add comments and documentation
- Use meaningful variable names
- Avoid global business rules when possible

### Performance Optimization
- Limit GlideRecord queries (use setLimit)
- Use encoded queries for complex conditions
- Avoid nested queries and loops
- Implement caching where appropriate
- Use async business rules for non-critical updates
- Index frequently queried fields

### Security Best Practices
- Implement ACLs for data access control
- Validate user input on client and server
- Use GlideRecord instead of direct SQL
- Follow principle of least privilege
- Sanitize data before display
- Use encrypted fields for sensitive data

### Integration Patterns
- Use REST API for modern integrations
- Implement proper error handling and retry logic
- Use credentials store for API keys
- Log integration activities
- Implement rate limiting
- Use MID Server for on-premise connectivity

## Anti-Patterns

### Code Smells
- Complex business rules with too much logic
- Client scripts that make synchronous GlideAjax calls
- Hardcoded sys_ids in scripts
- Missing null checks on GlideRecord queries
- Global variables without proper scoping
- Direct DOM manipulation in Service Portal

### Performance Issues
- Queries without limits on large tables
- Synchronous business rules that slow transactions
- Missing indexes on custom fields
- Recursive business rule triggers
- Loading unnecessary related records
- Heavy client scripts on form load

### Design Issues
- Tight coupling between components
- No separation of concerns
- Monolithic Script Includes
- Duplicated code across multiple scripts
- Poor error handling strategy
- Missing logging and debugging info

## Resources

### Official Documentation
- [ServiceNow Developer Portal](https://developer.servicenow.com/) - Main hub
- [API Reference](https://developer.servicenow.com/dev.do#!/reference) - Complete API docs
- [Product Documentation](https://docs.servicenow.com/) - User guides
- [Community Wiki](https://community.servicenow.com/) - Knowledge base

### Learning Platforms
- [ServiceNow Learning](https://www.servicenow.com/services/training-and-certification.html) - Official training
- [Now Learning](https://nowlearning.servicenow.com/) - Free courses
- [Developer Program](https://developer.servicenow.com/dev.do) - Resources for developers
- [ServiceNow Academy](https://www.servicenow.com/education/) - Certification paths

### Tools & Resources
- [Personal Developer Instance](https://developer.servicenow.com/dev.do#!/learn/learning-plans/tokyo/new_to_servicenow/app_store_learnv2_buildmyfirstapp_tokyo_personal_developer_instances) - Free dev environment
- [Studio IDE](https://docs.servicenow.com/bundle/tokyo-application-development/page/build/applications/concept/studio.html) - Development environment
- [REST API Explorer](https://docs.servicenow.com/bundle/tokyo-application-development/page/integrate/inbound-rest/concept/use-REST-API-Explorer.html) - Test APIs
- [GitHub ServiceNow](https://github.com/ServiceNow) - Sample code

### Community Resources
- [ServiceNow Community](https://community.servicenow.com/) - Forums and discussions
- [Share](https://developer.servicenow.com/connect.do#!/share) - Code sharing platform
- [ServiceNow Guru](https://www.servicenowguru.com/) - Tutorials and tips
- [SNProtips](https://snprotips.com/) - Best practices blog
