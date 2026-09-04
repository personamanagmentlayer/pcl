# Workday Expert — Implementation Examples

Reference material for the `workday-expert` skill. See [SKILL.md](../SKILL.md).

## Implementation Examples

### Custom Report with Calculated Fields

```xml
<!-- Worker Tenure Report Definition -->
<Report>
    <Report_Name>Worker Tenure Analysis</Report_Name>
    <Report_Type>Matrix</Report_Type>

    <Data_Source>
        <Primary>All Active Workers</Primary>
        <Secondary>Worker's Compensation Data</Secondary>
    </Data_Source>

    <Fields>
        <Field>
            <Field_Name>Worker</Field_Name>
            <Source>Worker</Source>
        </Field>
        <Field>
            <Field_Name>Hire Date</Field_Name>
            <Source>Worker.Hire_Date</Source>
        </Field>
        <Field>
            <Field_Name>Tenure (Years)</Field_Name>
            <Type>Calculated</Type>
            <Formula>
                DATEDIFF(YEAR, [Worker.Hire_Date], CURRENT_DATE())
            </Formula>
        </Field>
        <Field>
            <Field_Name>Tenure Band</Field_Name>
            <Type>Calculated</Type>
            <Formula>
                IF([Tenure_Years] &lt; 1, "0-1 years",
                   IF([Tenure_Years] &lt; 3, "1-3 years",
                      IF([Tenure_Years] &lt; 5, "3-5 years",
                         IF([Tenure_Years] &lt; 10, "5-10 years", "10+ years"))))
            </Formula>
        </Field>
        <Field>
            <Field_Name>Annual Salary</Field_Name>
            <Source>Worker.Compensation.Annual_Salary</Source>
        </Field>
    </Fields>

    <Filters>
        <Filter>
            <Field>Worker.Active_Status</Field>
            <Operator>Equals</Operator>
            <Value>Active</Value>
        </Filter>
    </Filters>

    <Grouping>
        <Group_By>Tenure_Band</Group_By>
        <Aggregation>
            <Field>Worker</Field>
            <Function>Count</Function>
        </Aggregation>
        <Aggregation>
            <Field>Annual_Salary</Field>
            <Function>Average</Function>
        </Aggregation>
    </Grouping>
</Report>
```

### Workday Studio Integration

```java
// Custom Integration Component in Workday Studio
package com.company.workday.integration;

import com.capeclear.mediation.MediationContext;
import com.capeclear.mediation.impl.cc.MediationException;
import com.capeclear.mediation.impl.DataObject;
import com.workday.esb.intsys.Transform;

public class WorkerDataTransform implements Transform {

    @Override
    public Object transform(Object input, MediationContext context)
            throws MediationException {

        try {
            DataObject inputData = (DataObject) input;
            DataObject outputData = context.newDataObject();

            // Extract worker information
            String workerId = inputData.getString("Worker/Worker_ID");
            String firstName = inputData.getString("Worker/Personal_Data/First_Name");
            String lastName = inputData.getString("Worker/Personal_Data/Last_Name");
            String email = inputData.getString("Worker/Email");

            // Transform to external format
            outputData.setString("EmployeeID", workerId);
            outputData.setString("FullName", firstName + " " + lastName);
            outputData.setString("EmailAddress", email);

            // Calculate tenure
            String hireDateStr = inputData.getString("Worker/Hire_Date");
            if (hireDateStr != null && !hireDateStr.isEmpty()) {
                long tenure = calculateTenure(hireDateStr);
                outputData.setLong("TenureMonths", tenure);
            }

            // Get organization data
            DataObject orgData = inputData.getDataObject("Worker/Organization_Data");
            if (orgData != null) {
                outputData.setString("Department",
                    orgData.getString("Cost_Center/Cost_Center_Name"));
                outputData.setString("Manager",
                    orgData.getString("Manager/Worker_Name"));
            }

            // Get compensation
            DataObject compData = inputData.getDataObject("Worker/Compensation_Data");
            if (compData != null) {
                outputData.setDouble("AnnualSalary",
                    compData.getDouble("Annual_Salary/Amount"));
                outputData.setString("Currency",
                    compData.getString("Annual_Salary/Currency"));
            }

            return outputData;

        } catch (Exception e) {
            throw new MediationException("Error transforming worker data", e);
        }
    }

    private long calculateTenure(String hireDateStr) {
        // Parse date and calculate months of tenure
        // Implementation details omitted for brevity
        return 0L;
    }
}
```

### Business Process Configuration (XML)

```xml
<!-- Time Off Request Business Process -->
<BusinessProcess>
    <Name>Request Time Off</Name>
    <Type>Time_Off</Type>

    <Initiator>
        <Worker_Type>Employee</Worker_Type>
    </Initiator>

    <Steps>
        <Step>
            <Step_Order>1</Step_Order>
            <Step_Type>Review</Step_Type>
            <Assignee>Manager</Assignee>
            <Assignment_Rule>
                Worker's Manager Supervisory Organization
            </Assignment_Rule>

            <Approval_Options>
                <Option>Approve</Option>
                <Option>Deny</Option>
                <Option>Send Back</Option>
            </Approval_Options>

            <Conditions>
                <Condition>
                    <Field>Time_Off_Days</Field>
                    <Operator>Greater_Than</Operator>
                    <Value>5</Value>
                    <Action>Add_Approver</Action>
                    <Additional_Approver>
                        Manager's Manager
                    </Additional_Approver>
                </Condition>
            </Conditions>

            <Notifications>
                <Notification>
                    <Trigger>Step_Assigned</Trigger>
                    <Recipient>Assignee</Recipient>
                    <Subject>Time Off Request Requires Your Approval</Subject>
                    <Template>Time_Off_Approval_Notification</Template>
                </Notification>
            </Notifications>
        </Step>

        <Step>
            <Step_Order>2</Step_Order>
            <Step_Type>Automated</Step_Type>
            <Action>Update_Calendar</Action>
            <Condition>Previous_Step_Approved</Condition>
        </Step>
    </Steps>

    <Completion_Actions>
        <Action>
            <Type>Send_Notification</Type>
            <Recipient>Initiator</Recipient>
            <Subject>Time Off Request Status</Subject>
        </Action>
        <Action>
            <Type>Update_Time_Off_Balance</Type>
        </Action>
    </Completion_Actions>
</BusinessProcess>
```

### REST API Integration (Python)

```python
import requests
import xml.etree.ElementTree as ET
from datetime import datetime

class WorkdayAPI:
    def __init__(self, tenant, username, password):
        self.base_url = f"https://wd2-impl-services1.workday.com/ccx/service/{tenant}"
        self.auth = (f"{username}@{tenant}", password)
        self.headers = {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml'
        }

    def get_workers(self, as_of_date=None):
        """Retrieve all active workers"""
        url = f"{self.base_url}/Human_Resources/v38.0"

        if as_of_date is None:
            as_of_date = datetime.now().strftime('%Y-%m-%d')

        soap_request = f"""
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                          xmlns:bsvc="urn:com.workday/bsvc">
            <soapenv:Header/>
            <soapenv:Body>
                <bsvc:Get_Workers_Request>
                    <bsvc:Request_Criteria>
                        <bsvc:Transaction_Log_Criteria_Data>
                            <bsvc:Transaction_Date_Range_Data>
                                <bsvc:Updated_From>{as_of_date}</bsvc:Updated_From>
                                <bsvc:Updated_Through>{as_of_date}</bsvc:Updated_Through>
                            </bsvc:Transaction_Date_Range_Data>
                        </bsvc:Transaction_Log_Criteria_Data>
                    </bsvc:Request_Criteria>
                    <bsvc:Response_Group>
                        <bsvc:Include_Personal_Information>true</bsvc:Include_Personal_Information>
                        <bsvc:Include_Employment_Information>true</bsvc:Include_Employment_Information>
                        <bsvc:Include_Compensation>true</bsvc:Include_Compensation>
                        <bsvc:Include_Organizations>true</bsvc:Include_Organizations>
                    </bsvc:Response_Group>
                </bsvc:Get_Workers_Request>
            </soapenv:Body>
        </soapenv:Envelope>
        """

        response = requests.post(
            url,
            data=soap_request,
            headers=self.headers,
            auth=self.auth
        )

        if response.status_code == 200:
            return self._parse_workers_response(response.content)
        else:
            raise Exception(f"API call failed: {response.status_code}")

    def _parse_workers_response(self, xml_content):
        """Parse XML response and extract worker data"""
        root = ET.fromstring(xml_content)
        workers = []

        # Define namespaces
        ns = {
            'wd': 'urn:com.workday/bsvc',
            'env': 'http://schemas.xmlsoap.org/soap/envelope/'
        }

        # Extract worker data
        for worker in root.findall('.//wd:Worker', ns):
            worker_data = {
                'worker_id': worker.find('.//wd:Worker_ID', ns).text,
                'first_name': worker.find('.//wd:First_Name', ns).text,
                'last_name': worker.find('.//wd:Last_Name', ns).text,
                'email': worker.find('.//wd:Email_Address', ns).text,
                'hire_date': worker.find('.//wd:Hire_Date', ns).text,
                'position': worker.find('.//wd:Position_Title', ns).text,
                'department': worker.find('.//wd:Department', ns).text
            }
            workers.append(worker_data)

        return workers

    def update_worker_contact(self, worker_id, email, phone):
        """Update worker contact information"""
        url = f"{self.base_url}/Human_Resources/v38.0"

        soap_request = f"""
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                          xmlns:bsvc="urn:com.workday/bsvc">
            <soapenv:Body>
                <bsvc:Maintain_Contact_Information_Request>
                    <bsvc:Business_Process_Parameters>
                        <bsvc:Auto_Complete>true</bsvc:Auto_Complete>
                        <bsvc:Run_Now>true</bsvc:Run_Now>
                    </bsvc:Business_Process_Parameters>
                    <bsvc:Worker_Reference>
                        <bsvc:ID bsvc:type="Employee_ID">{worker_id}</bsvc:ID>
                    </bsvc:Worker_Reference>
                    <bsvc:Contact_Information_Data>
                        <bsvc:Email_Address_Data>
                            <bsvc:Email_Address>{email}</bsvc:Email_Address>
                            <bsvc:Usage_Data bsvc:Public="1">
                                <bsvc:Type_Data bsvc:Primary="1">
                                    <bsvc:Type_Reference>
                                        <bsvc:ID bsvc:type="Communication_Usage_Type_ID">WORK</bsvc:ID>
                                    </bsvc:Type_Reference>
                                </bsvc:Type_Data>
                            </bsvc:Usage_Data>
                        </bsvc:Email_Address_Data>
                        <bsvc:Phone_Data>
                            <bsvc:Phone_Number>{phone}</bsvc:Phone_Number>
                            <bsvc:Usage_Data bsvc:Public="1">
                                <bsvc:Type_Data bsvc:Primary="1">
                                    <bsvc:Type_Reference>
                                        <bsvc:ID bsvc:type="Communication_Usage_Type_ID">WORK</bsvc:ID>
                                    </bsvc:Type_Reference>
                                </bsvc:Type_Data>
                            </bsvc:Usage_Data>
                        </bsvc:Phone_Data>
                    </bsvc:Contact_Information_Data>
                </bsvc:Maintain_Contact_Information_Request>
            </soapenv:Body>
        </soapenv:Envelope>
        """

        response = requests.post(
            url,
            data=soap_request,
            headers=self.headers,
            auth=self.auth
        )

        return response.status_code == 200
```
