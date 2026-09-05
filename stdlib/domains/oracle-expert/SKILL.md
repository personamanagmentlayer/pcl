---
name: oracle-expert
version: 1.1.0
description: >-
  Expert in Oracle Database, PL/SQL programming, Oracle RAC, Data Guard, performance
  tuning, backup/recovery, and enterprise database administration. Use when the user
  mentions database, enterprise, ERP, PL/SQL, Oracle RAC, or Data Guard, or when the task
  involves Oracle Architecture, PL/SQL Programming, Performance & Tuning, or PL/SQL Package
  with Complex Logic.
category: domains
tags:
  [
    oracle,
    database,
    enterprise,
    erp,
    plsql,
    rac,
    data-guard,
    performance-tuning,
    rman,
    awr,
    sql-tuning,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: expert
---

# Oracle Database Expert

## Core Concepts

### Oracle Architecture

- **Instance** - Memory structures (SGA, PGA) and background processes
- **Database** - Physical files (data files, control files, redo logs)
- **Tablespace** - Logical storage container
- **Schema** - Collection of database objects owned by a user
- **RAC** - Real Application Clusters for high availability
- **Data Guard** - Disaster recovery and data protection

### PL/SQL Programming

- **Procedures** - Reusable code blocks
- **Functions** - Return value blocks
- **Packages** - Grouped procedures and functions
- **Triggers** - Event-driven code execution
- **Collections** - Arrays and nested tables
- **Exception Handling** - Error management

### Performance & Tuning

- **Execution Plans** - Query optimization paths
- **AWR** - Automatic Workload Repository
- **ASH** - Active Session History
- **Statistics** - Cost-based optimizer data
- **Indexes** - B-tree, bitmap, function-based
- **Partitioning** - Data distribution strategies

## Best Practices

### Database Design

- Normalize data to appropriate level (usually 3NF)
- Use appropriate data types
- Implement proper constraints (PK, FK, CHECK)
- Design efficient indexes
- Use partitioning for large tables
- Implement proper security model

### PL/SQL Development

- Use bind variables to prevent SQL injection
- Implement exception handling
- Use bulk operations for better performance
- Follow naming conventions
- Document code thoroughly
- Use packages for code organization

### Performance Optimization

- Analyze execution plans regularly
- Update statistics frequently
- Use appropriate indexes
- Implement result cache when applicable
- Optimize SQL queries before tuning database
- Monitor AWR reports

### High Availability

- Implement Oracle RAC for clustering
- Configure Data Guard for disaster recovery
- Use RMAN for backup and recovery
- Implement flashback technology
- Monitor alert logs
- Regular testing of recovery procedures

## Anti-Patterns

### Code Issues

- SELECT \* in production code
- Implicit cursors for large result sets
- Missing exception handling
- Hard-coded values
- Recursive triggers
- Autonomous transactions without clear purpose

### Performance Problems

- Missing indexes on foreign keys
- No statistics on tables
- Using hints unnecessarily
- Lack of bind variables
- Full table scans on large tables
- Inadequate memory allocation

### Design Mistakes

- Denormalization without justification
- Missing constraints
- Improper use of sequences
- Inadequate partitioning strategy
- No archiving strategy for old data
- Mixed OLTP and OLAP workloads

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — PL/SQL Package with Complex Logic, Complex Trigger with Business Logic, Performance Tuning Query, RMAN Backup Script

## Resources

### Official Documentation

- [Oracle Documentation](https://docs.oracle.com/en/database/) - Complete documentation
- [PL/SQL Language Reference](https://docs.oracle.com/en/database/oracle/oracle-database/21/lnpls/) - Language guide
- [Performance Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/21/tgdba/) - Tuning reference
- [Database Concepts](https://docs.oracle.com/en/database/oracle/oracle-database/21/cncpt/) - Architecture guide

### Learning Platforms

- [Oracle University](https://education.oracle.com/) - Official training
- [Oracle Learning Library](https://apexapps.oracle.com/pls/apex/f?p=44785:1) - Free courses
- [LiveSQL](https://livesql.oracle.com/) - Online SQL practice
- [Oracle Base](https://oracle-base.com/) - Tutorials and articles

### Tools & Resources

- [SQL Developer](https://www.oracle.com/database/technologies/appdev/sqldeveloper-landing.html) - Free IDE
- [Enterprise Manager](https://www.oracle.com/enterprise-manager/) - Database management
- [RMAN](https://docs.oracle.com/en/database/oracle/oracle-database/21/bradv/) - Backup and recovery
- [AWR Reports](https://docs.oracle.com/en/database/oracle/oracle-database/21/tgdba/automatic-performance-diagnostics.html) - Performance analysis

### Community Resources

- [Ask TOM](https://asktom.oracle.com/) - Q&A by Oracle experts
- [Oracle Community](https://community.oracle.com/) - Forums
- [Oracle Blogs](https://blogs.oracle.com/database/) - Technical articles
- [Stack Overflow Oracle Tag](https://stackoverflow.com/questions/tagged/oracle) - Community help
