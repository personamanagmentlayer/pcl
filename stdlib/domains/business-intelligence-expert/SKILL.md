---
name: business-intelligence-expert
version: 1.1.0
description: >-
  Build comprehensive business intelligence solutions including data warehouses, ETL
  pipelines, interactive dashboards, and analytical reporting systems. Use when the user
  mentions BI, data warehousing, star or snowflake schemas, OLAP cubes, ETL/ELT pipelines,
  dashboards, KPIs, or analytical reporting.
category: domains
tags:
  [
    bi,
    business-intelligence,
    data-warehouse,
    reporting,
    dashboards,
    data-visualization,
    analytics,
    olap,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - WebSearch
metadata:
  author: PCL Standard Library
  complexity: expert
  estimated-time: 45 minutes
---

# Business Intelligence Expert

Build comprehensive business intelligence solutions including data warehouses, ETL pipelines, interactive dashboards, and analytical reporting systems.

## Learning Objectives

- Master business intelligence platforms and architectures
- Understand data warehousing and ETL processes
- Implement reporting and dashboard solutions
- Apply data visualization best practices
- Navigate OLAP and multidimensional analysis

## Prerequisites

- Understanding of database systems and SQL
- Knowledge of data modeling concepts
- Familiarity with reporting tools
- Experience with data analysis and metrics

## Core Concepts

### Business Intelligence Architecture

End-to-end BI systems including data sources, ETL processes, data warehouses, OLAP cubes, reporting layers, and visualization tools that transform raw data into actionable business insights.

### Data Warehousing

Centralized repositories that consolidate data from multiple sources using dimensional modeling (star/snowflake schemas), providing historical data storage optimized for analysis and reporting.

### ETL (Extract, Transform, Load)

Processes for extracting data from source systems, transforming it for consistency and quality, and loading it into data warehouses with scheduling, error handling, and data validation.

### Reporting & Dashboards

Interactive visualizations and reports that present key performance indicators, trends, and insights to stakeholders with drill-down capabilities, filters, and real-time or scheduled updates.

### OLAP & Analytics

Online Analytical Processing enabling multidimensional analysis through operations like slice, dice, drill-down, roll-up, and pivot for exploring data from various business perspectives.

## Best Practices

### Data Warehouse Design

- Use dimensional modeling (star/snowflake schemas)
- Define clear business processes and grain
- Implement slowly changing dimensions (SCD)
- Use surrogate keys for dimension tables
- Optimize for query performance
- Document data lineage and definitions
- Plan for scalability and growth

### ETL Development

- Implement robust error handling
- Maintain data quality checks
- Use incremental loading when possible
- Log all transformations and errors
- Implement idempotent processes
- Monitor execution times and performance
- Document transformation logic

### Dashboard Design

- Focus on key metrics and KPIs
- Use appropriate visualization types
- Provide context with comparisons
- Enable drill-down capabilities
- Optimize load times
- Design for mobile viewing
- Follow data visualization best practices

### Performance Optimization

- Pre-aggregate common queries
- Implement partitioning strategies
- Use columnarvstore indexes
- Cache frequently accessed data
- Optimize ETL schedules
- Monitor query performance
- Balance real-time vs batch processing

## Anti-Patterns

### Poor Practices

- Copying transactional database design to warehouse
- No data quality validation in ETL
- Over-complicated transformations
- Building dashboards without user input
- Ignoring data governance
- No documentation of metrics
- Poor naming conventions
- Mixing operational and analytical workloads

### Common Mistakes

- Not understanding business requirements
- Creating too many dashboards
- Using wrong chart types
- Slow-running queries in dashboards
- No version control for BI artifacts
- Inadequate testing of ETL jobs
- Ignoring data security and access control
- Not monitoring BI system performance

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Data Warehouse Core System, ETL Pipeline System, Dashboard & Visualization System

## Resources

### BI Platforms

- Tableau - Visual analytics platform
- Power BI - Microsoft BI solution
- Qlik Sense - Associative analytics
- Looker - Modern BI platform
- MicroStrategy - Enterprise BI
- Domo - Cloud BI platform

### Data Warehouse Solutions

- Snowflake - Cloud data warehouse
- Amazon Redshift - AWS data warehouse
- Google BigQuery - Serverless data warehouse
- Azure Synapse - Analytics service
- Teradata - Enterprise data warehouse

### ETL Tools

- Informatica - Enterprise ETL
- Talend - Open-source ETL
- Apache Airflow - Workflow orchestration
- dbt - Data transformation tool
- Fivetran - Automated data pipelines

### Learning Resources

- Kimball Group - Dimensional modeling
- TDWI (Transforming Data with Intelligence)
- Gartner BI & Analytics research
- Data Warehousing Institute

### Standards & Methodologies

- Kimball Methodology
- Inmon Methodology (Corporate Information Factory)
- Data Vault 2.0
- CRISP-DM for analytics

---

_Part of the PCL Standard Library - Master business intelligence systems and transform data into actionable insights for strategic decision-making._

_CONGRATULATIONS! This is skill #100, completing the PCL Standard Library with comprehensive coverage across all major business and technology domains!_
