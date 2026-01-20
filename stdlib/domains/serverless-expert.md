# Serverless Expert

---

skill_id: serverless-expert
name: Serverless Expert
allowed-tools:

- Read
- Write
- Bash
- Grep
- Glob
  category: domains
  tags: [serverless, faas, lambda, azure-functions, event-driven, cloud-native, microservices, api-gateway]
  version: 1.0.0
  author: PCL Standard Library
  dependencies: []
  complexity: expert
  estimated_time: 45 minutes
  objectives:
- Master serverless architecture patterns and best practices
- Build event-driven systems with AWS Lambda and Azure Functions
- Implement Function-as-a-Service (FaaS) applications
- Design for cold starts and optimization strategies
- Integrate serverless with API Gateway and event sources
  prerequisites:
- Strong cloud platform knowledge (AWS/Azure/GCP)
- Understanding of event-driven architectures
- Knowledge of microservices patterns
- Familiarity with Infrastructure as Code
  outcome: Design and implement production-grade serverless applications with optimal performance, cost efficiency, and scalability

---

## Core Concepts

### Function-as-a-Service (FaaS)

Cloud computing model where functions execute in response to events without managing servers. Platform automatically provisions, scales, and manages infrastructure based on demand.

### Event-Driven Architecture

Design paradigm where functions react to events from various sources (HTTP requests, database changes, file uploads, queues). Enables loose coupling and scalability.

### Cold Starts & Warm Starts

Cold start occurs when function executes for first time or after idle period, requiring initialization. Warm starts reuse existing execution environment for faster response times.

### Serverless Orchestration

Coordination of multiple serverless functions in workflows using services like AWS Step Functions or Azure Durable Functions. Enables complex business logic across distributed functions.

### Serverless Security

Security considerations including IAM roles, function permissions, API authentication, secrets management, and VPC networking for serverless workloads.

## Code Examples

### AWS Lambda with Advanced Patterns

```python
import json
import boto3
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from decimal import Decimal
import logging
from functools import wraps

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients (reuse across invocations)
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
sns = boto3.client('sns')
sqs = boto3.client('sqs')

# Environment variables
TABLE_NAME = os.environ.get('DYNAMODB_TABLE', 'orders')
BUCKET_NAME = os.environ.get('S3_BUCKET', 'order-documents')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')


@dataclass
class Order:
    order_id: str
    customer_id: str
    items: List[Dict[str, Any]]
    total_amount: Decimal
    status: str
    created_at: str
    updated_at: Optional[str] = None


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def lambda_handler_decorator(func):
    """Decorator for common lambda handler logic"""
    @wraps(func)
    def wrapper(event, context):
        # Log invocation
        logger.info(f"Function invoked: {context.function_name}")
        logger.info(f"Request ID: {context.request_id}")
        logger.info(f"Event: {json.dumps(event)}")

        try:
            # Execute handler
            result = func(event, context)

            # Return successful response
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(result, cls=DecimalEncoder)
            }

        except ValueError as e:
            logger.error(f"Validation error: {str(e)}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': str(e)})
            }

        except Exception as e:
            logger.error(f"Error processing request: {str(e)}", exc_info=True)
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Internal server error'})
            }

    return wrapper


@lambda_handler_decorator
def create_order_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for creating new orders
    Trigger: API Gateway POST /orders
    """
    # Parse request body
    body = json.loads(event.get('body', '{}'))

    # Validate input
    if not body.get('customer_id') or not body.get('items'):
        raise ValueError("Missing required fields: customer_id, items")

    # Calculate total
    total_amount = sum(
        Decimal(str(item['price'])) * item['quantity']
        for item in body['items']
    )

    # Create order object
    order = Order(
        order_id=context.request_id,
        customer_id=body['customer_id'],
        items=body['items'],
        total_amount=total_amount,
        status='pending',
        created_at=datetime.now().isoformat()
    )

    # Store in DynamoDB
    table = dynamodb.Table(TABLE_NAME)
    table.put_item(Item=asdict(order))

    # Publish event to SNS
    if SNS_TOPIC_ARN:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=json.dumps({
                'event_type': 'order_created',
                'order_id': order.order_id,
                'customer_id': order.customer_id,
                'total_amount': float(order.total_amount)
            }),
            MessageAttributes={
                'event_type': {'DataType': 'String', 'StringValue': 'order_created'}
            }
        )

    logger.info(f"Order created: {order.order_id}")

    return {
        'message': 'Order created successfully',
        'order_id': order.order_id,
        'total_amount': float(total_amount)
    }


def process_order_stream_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for DynamoDB Stream processing
    Trigger: DynamoDB Stream on orders table
    """
    logger.info(f"Processing {len(event['Records'])} DynamoDB records")

    for record in event['Records']:
        event_name = record['eventName']  # INSERT, MODIFY, REMOVE

        if event_name in ['INSERT', 'MODIFY']:
            new_image = record['dynamodb'].get('NewImage', {})
            order_id = new_image.get('order_id', {}).get('S')
            status = new_image.get('status', {}).get('S')

            logger.info(f"Order {order_id} status: {status}")

            # Trigger downstream processing based on status
            if status == 'pending':
                # Validate payment
                invoke_lambda('payment-processor', {'order_id': order_id})

            elif status == 'confirmed':
                # Start fulfillment
                invoke_lambda('fulfillment-service', {'order_id': order_id})

            elif status == 'shipped':
                # Send notification
                send_customer_notification(order_id, 'Your order has shipped!')

    return {'processed': len(event['Records'])}


def s3_event_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for S3 event processing
    Trigger: S3 bucket object created
    """
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        logger.info(f"Processing S3 object: s3://{bucket}/{key}")

        # Download file
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read()

        # Process file (example: parse CSV, validate document, etc.)
        processed_data = process_file_content(content, key)

        # Store processed result
        result_key = f"processed/{key}"
        s3.put_object(
            Bucket=bucket,
            Key=result_key,
            Body=json.dumps(processed_data),
            ContentType='application/json'
        )

        logger.info(f"Processed file saved: s3://{bucket}/{result_key}")

    return {'status': 'success'}


def sqs_batch_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for SQS batch processing
    Trigger: SQS queue messages
    """
    successful = []
    failed = []

    for record in event['Records']:
        message_id = record['messageId']
        body = json.loads(record['body'])

        try:
            # Process message
            process_queue_message(body)
            successful.append(message_id)

        except Exception as e:
            logger.error(f"Failed to process message {message_id}: {str(e)}")
            failed.append({
                'itemIdentifier': message_id
            })

    # Return batch item failures for retry
    return {
        'batchItemFailures': failed
    }


def scheduled_cleanup_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for scheduled cleanup task
    Trigger: EventBridge (CloudWatch Events) scheduled rule
    """
    logger.info("Running scheduled cleanup task")

    table = dynamodb.Table(TABLE_NAME)

    # Query old completed orders
    cutoff_date = (datetime.now() - timedelta(days=90)).isoformat()

    response = table.scan(
        FilterExpression='#status = :status AND created_at < :cutoff',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'completed',
            ':cutoff': cutoff_date
        }
    )

    items_deleted = 0

    # Archive and delete old orders
    for item in response.get('Items', []):
        # Archive to S3
        archive_key = f"archive/{item['order_id']}.json"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=archive_key,
            Body=json.dumps(item, cls=DecimalEncoder)
        )

        # Delete from DynamoDB
        table.delete_item(Key={'order_id': item['order_id']})
        items_deleted += 1

    logger.info(f"Archived and deleted {items_deleted} old orders")

    return {
        'items_deleted': items_deleted,
        'archive_location': f"s3://{BUCKET_NAME}/archive/"
    }


# Helper functions

def invoke_lambda(function_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke another Lambda function asynchronously"""
    lambda_client = boto3.client('lambda')

    response = lambda_client.invoke(
        FunctionName=function_name,
        InvocationType='Event',  # Async invocation
        Payload=json.dumps(payload)
    )

    return {'StatusCode': response['StatusCode']}


def send_customer_notification(order_id: str, message: str):
    """Send notification via SNS"""
    if SNS_TOPIC_ARN:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=message,
            Subject=f"Order Update: {order_id}",
            MessageAttributes={
                'order_id': {'DataType': 'String', 'StringValue': order_id}
            }
        )


def process_file_content(content: bytes, filename: str) -> Dict[str, Any]:
    """Process uploaded file content"""
    # Example processing logic
    return {
        'filename': filename,
        'size': len(content),
        'processed_at': datetime.now().isoformat()
    }


def process_queue_message(message: Dict[str, Any]):
    """Process SQS queue message"""
    # Example processing logic
    logger.info(f"Processing message: {message}")
```

### Serverless Framework Configuration

```yaml
# serverless.yml - Infrastructure as Code for serverless application
service: order-processing-service

frameworkVersion: '3'

provider:
  name: aws
  runtime: python3.11
  region: us-east-1
  stage: ${opt:stage, 'dev'}

  # IAM role statements
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - !GetAtt OrdersTable.Arn
            - !Sub '${OrdersTable.Arn}/index/*'

        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
          Resource:
            - !Sub '${OrdersBucket.Arn}/*'

        - Effect: Allow
          Action:
            - sns:Publish
          Resource:
            - !Ref OrderEventsTopic

        - Effect: Allow
          Action:
            - lambda:InvokeFunction
          Resource:
            - !Sub 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:*'

  # Environment variables
  environment:
    DYNAMODB_TABLE: !Ref OrdersTable
    S3_BUCKET: !Ref OrdersBucket
    SNS_TOPIC_ARN: !Ref OrderEventsTopic
    STAGE: ${self:provider.stage}

  # API Gateway configuration
  apiGateway:
    shouldStartNameWithService: true
    metrics: true

  # Logging
  logs:
    restApi:
      accessLogging: true
      executionLogging: true
      level: INFO

  # Tracing
  tracing:
    apiGateway: true
    lambda: true

# Package configuration
package:
  individually: true
  exclude:
    - node_modules/**
    - venv/**
    - .git/**
    - tests/**

# Functions
functions:
  createOrder:
    handler: handlers/orders.create_order_handler
    description: Create new order
    memorySize: 512
    timeout: 10
    reservedConcurrency: 100
    events:
      - http:
          path: /orders
          method: post
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiAuthorizer
    environment:
      LOG_LEVEL: INFO

  getOrder:
    handler: handlers/orders.get_order_handler
    description: Get order by ID
    memorySize: 256
    timeout: 5
    events:
      - http:
          path: /orders/{orderId}
          method: get
          cors: true
          request:
            parameters:
              paths:
                orderId: true

  processOrderStream:
    handler: handlers/orders.process_order_stream_handler
    description: Process DynamoDB stream events
    memorySize: 512
    timeout: 30
    events:
      - stream:
          type: dynamodb
          arn: !GetAtt OrdersTable.StreamArn
          batchSize: 10
          startingPosition: LATEST
          maximumRetryAttempts: 2
          parallelizationFactor: 2
          filterPatterns:
            - eventName: [INSERT, MODIFY]

  processS3Upload:
    handler: handlers/files.s3_event_handler
    description: Process uploaded files
    memorySize: 1024
    timeout: 60
    events:
      - s3:
          bucket: !Ref OrdersBucket
          event: s3:ObjectCreated:*
          rules:
            - prefix: uploads/
            - suffix: .csv
          existing: true

  processSQSMessages:
    handler: handlers/queue.sqs_batch_handler
    description: Process SQS messages
    memorySize: 512
    timeout: 30
    reservedConcurrency: 50
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
          batchSize: 10
          maximumBatchingWindowInSeconds: 5
          functionResponseType: ReportBatchItemFailures

  scheduledCleanup:
    handler: handlers/maintenance.scheduled_cleanup_handler
    description: Archive old completed orders
    memorySize: 512
    timeout: 300
    events:
      - schedule:
          rate: cron(0 2 * * ? *) # Daily at 2 AM UTC
          enabled: true
          input:
            action: cleanup

# CloudFormation resources
resources:
  Resources:
    # DynamoDB table
    OrdersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-orders-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        StreamSpecification:
          StreamViewType: NEW_AND_OLD_IMAGES
        AttributeDefinitions:
          - AttributeName: order_id
            AttributeType: S
          - AttributeName: customer_id
            AttributeType: S
          - AttributeName: created_at
            AttributeType: S
        KeySchema:
          - AttributeName: order_id
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: customer-index
            KeySchema:
              - AttributeName: customer_id
                KeyType: HASH
              - AttributeName: created_at
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
        PointInTimeRecoverySpecification:
          PointInTimeRecoveryEnabled: true
        Tags:
          - Key: Environment
            Value: ${self:provider.stage}

    # S3 bucket
    OrdersBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:service}-documents-${self:provider.stage}
        PublicAccessBlockConfiguration:
          BlockPublicAcls: true
          BlockPublicPolicy: true
          IgnorePublicAcls: true
          RestrictPublicBuckets: true
        LifecycleConfiguration:
          Rules:
            - Id: ArchiveOldFiles
              Status: Enabled
              Transitions:
                - StorageClass: GLACIER
                  TransitionInDays: 90
              ExpirationInDays: 365
        VersioningConfiguration:
          Status: Enabled

    # SNS topic
    OrderEventsTopic:
      Type: AWS::SNS::Topic
      Properties:
        TopicName: ${self:service}-events-${self:provider.stage}
        DisplayName: Order Events Topic

    # SQS queue
    OrderQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-queue-${self:provider.stage}
        VisibilityTimeout: 180
        MessageRetentionPeriod: 1209600 # 14 days
        RedrivePolicy:
          deadLetterTargetArn: !GetAtt OrderDLQ.Arn
          maxReceiveCount: 3

    # Dead letter queue
    OrderDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-dlq-${self:provider.stage}
        MessageRetentionPeriod: 1209600 # 14 days

    # API Gateway authorizer
    ApiAuthorizer:
      Type: AWS::ApiGateway::Authorizer
      Properties:
        Name: CognitoAuthorizer
        Type: COGNITO_USER_POOLS
        IdentitySource: method.request.header.Authorization
        RestApiId: !Ref ApiGatewayRestApi
        ProviderARNs:
          - !GetAtt UserPool.Arn

    # Cognito User Pool
    UserPool:
      Type: AWS::Cognito::UserPool
      Properties:
        UserPoolName: ${self:service}-users-${self:provider.stage}
        AutoVerifiedAttributes:
          - email
        Schema:
          - Name: email
            Required: true
            Mutable: false

# Plugins
plugins:
  - serverless-python-requirements
  - serverless-plugin-tracing
  - serverless-plugin-canary-deployments
  - serverless-offline

# Custom configuration
custom:
  pythonRequirements:
    dockerizePip: true
    layer: true

  deploymentSettings:
    type: Linear10PercentEvery1Minute
    alias: Live
    preTrafficHook: preHook
    postTrafficHook: postHook
    alarms:
      - ErrorsAlarm
      - ThrottlesAlarm
```

## Best Practices

### Function Design

- Keep functions small and single-purpose
- Design for idempotency to handle retries safely
- Use environment variables for configuration
- Implement proper error handling and logging
- Return appropriate HTTP status codes
- Version functions for gradual rollouts
- Minimize cold start impact with provisioned concurrency

### Performance Optimization

- Reuse connections and clients outside handler
- Use connection pooling for databases
- Minimize package size and dependencies
- Enable Lambda layers for shared code
- Optimize memory allocation (CPU scales with memory)
- Use async/await for concurrent operations
- Implement caching strategies

### Event-Driven Patterns

- Use dead letter queues for failed events
- Implement exponential backoff for retries
- Design for eventual consistency
- Use event sourcing for audit trails
- Implement circuit breakers for external services
- Batch process events when possible
- Use fan-out patterns for parallel processing

### Cost Optimization

- Right-size memory allocation
- Use reserved concurrency carefully
- Implement request throttling
- Archive logs to S3 after retention period
- Use S3 lifecycle policies
- Monitor and alert on cost anomalies
- Consider compute savings plans

## Anti-Patterns

### Common Mistakes

- Long-running functions exceeding timeout limits
- Not handling cold starts appropriately
- Synchronous processing of independent tasks
- Storing state in function memory
- Hardcoding configuration values
- Not implementing proper monitoring
- Ignoring concurrency limits
- Recursive function calls without limits

### Design Issues

- Functions doing too much (violating single responsibility)
- Tight coupling between functions
- Not using infrastructure as code
- Inadequate error handling and retries
- Missing dead letter queues
- Not implementing tracing
- Ignoring security best practices
- Poor secret management

## Resources

### Serverless Platforms

- AWS Lambda - Leading FaaS platform
- Azure Functions - Microsoft serverless
- Google Cloud Functions
- Cloudflare Workers - Edge computing
- Vercel Functions - Frontend-focused
- Netlify Functions

### Frameworks & Tools

- Serverless Framework - Multi-cloud IaC
- AWS SAM - AWS native framework
- Terraform - Infrastructure as code
- Pulumi - Modern IaC with programming languages
- LocalStack - Local AWS emulation
- serverless-offline - Local development

### Monitoring & Observability

- AWS X-Ray - Distributed tracing
- CloudWatch - Logs and metrics
- Datadog - APM and monitoring
- New Relic - Observability platform
- Lumigo - Serverless monitoring
- Thundra - Debugging and profiling

### Learning Resources

- AWS Well-Architected Serverless Lens
- Serverless Architecture Patterns
- Azure Serverless Computing Cookbook
- Serverless Stack - Full-stack tutorial
- Production-Ready Serverless course
- AWS Lambda Power Tuning

---

_Part of the PCL Standard Library - Build scalable, cost-effective applications without managing servers._
