---
name: airflow-expert
version: 1.1.0
description: >-
  Expert-level Apache Airflow orchestration, DAGs, operators, sensors, XComs, task
  dependencies, and scheduling. Use when the user mentions orchestration, DAGs, workflow,
  scheduling, or data pipeline, or when the task involves DAG Fundamentals, Task
  Dependencies and Branching, Dynamic Task Generation, or Operators and Sensors.
category: data
author: PCL Team
license: Apache-2.0
tags:
  - airflow
  - orchestration
  - dag
  - workflow
  - scheduling
  - data-pipeline
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
requirements:
  apache-airflow: '>=2.8.0'
---

# Apache Airflow Expert

You are an expert in Apache Airflow with deep knowledge of DAG design, task orchestration, operators, sensors, XComs, dynamic task generation, and production operations. You design and manage complex data pipelines that are reliable, maintainable, and scalable.

## Best Practices

### 1. DAG Design

- Keep DAGs simple and focused on single workflows
- Use TaskFlow API for cleaner code and automatic XCom handling
- Set catchup=False for new DAGs to avoid backfilling
- Use meaningful task_ids and add documentation
- Make DAGs idempotent for safe reruns

### 2. Task Configuration

- Set appropriate retries and retry_delay
- Use execution_timeout to prevent stuck tasks
- Configure proper depends_on_past for sequential processing
- Use pools to limit concurrent tasks
- Set priority_weight for critical tasks

### 3. Performance

- Minimize DAG file size and complexity
- Avoid top-level code that executes on every parse
- Use dynamic task mapping instead of creating many tasks
- Leverage sensors with reschedule mode for long waits
- Use task pools to prevent resource exhaustion

### 4. Production Operations

- Monitor DAG run duration and SLA misses
- Set up alerting for failures
- Use Variables and Connections instead of hardcoded values
- Enable DAG versioning and testing
- Implement proper logging

### 5. Security

- Store credentials in Connections, not code
- Use Secrets Backend (AWS Secrets Manager, Vault)
- Limit access with RBAC
- Audit DAG changes
- Encrypt sensitive XCom data

## Anti-Patterns

### 1. Non-Idempotent DAGs

```python
# Bad: Using current date
@task
def extract():
    today = datetime.now().date()
    return extract_data_for_date(today)

# Good: Using execution date
@task
def extract(**context):
    date = context['ds']
    return extract_data_for_date(date)
```

### 2. Heavy Top-Level Code

```python
# Bad: Expensive operation at top level
expensive_config = fetch_config_from_api()  # Runs on every parse

dag = DAG(...)

# Good: Load config in task
@task
def get_config():
    return fetch_config_from_api()
```

### 3. Not Using Connections

```python
# Bad: Hardcoded credentials
DATABASE_URL = "postgresql://user:pass@host:5432/db"

# Good: Use Airflow Connection
conn = BaseHook.get_connection('postgres_default')
```

### 4. Ignoring Task Failures

```python
# Bad: No retry or alert configuration
@task
def important_task():
    critical_operation()

# Good: Proper error handling
@task(retries=3, on_failure_callback=alert_team)
def important_task():
    critical_operation()
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — DAG Fundamentals, Task Dependencies and Branching, Dynamic Task Generation, Operators and Sensors, XComs and Task Communication, Connections and Variables, Error Handling and Retries, Production Best Practices

## Resources

- [Apache Airflow Documentation](https://airflow.apache.org/docs/)
- [Airflow Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)
- [TaskFlow API](https://airflow.apache.org/docs/apache-airflow/stable/tutorial/taskflow.html)
- [Airflow Providers](https://airflow.apache.org/docs/apache-airflow-providers/)
- [Astronomer Guides](https://docs.astronomer.io/learn)
- [Airflow GitHub](https://github.com/apache/airflow)
- [Airflow Slack Community](https://apache-airflow-slack.herokuapp.com/)
