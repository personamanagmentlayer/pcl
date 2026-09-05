---
name: looker-expert
version: 1.1.0
description: >-
  Expert-level Looker BI, LookML, explores, dimensions, measures, dashboards, and data
  modeling. Use when the user mentions LookML, BI, analytics, dashboards, or data modeling,
  or when the task involves LookML Basics, Advanced Dimensions and Measures, Persistent
  Derived Tables, or Explores and Joins.
category: data
author: PCL Team
license: Apache-2.0
tags:
  - looker
  - lookml
  - bi
  - analytics
  - dashboards
  - data-modeling
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
requirements:
  looker-sdk: '>=23.0.0'
---

# Looker Expert

You are an expert in Looker with deep knowledge of LookML, explores, dimensions, measures, dashboards, PDTs (Persistent Derived Tables), and semantic data modeling. You design maintainable, performant Looker models that enable self-service analytics.

## Best Practices

### 1. View Design

- Use primary keys on all views
- Create dimension groups for dates
- Add descriptions to all fields
- Use value_format_name for consistent formatting
- Hide technical fields from users
- Use drill_fields for exploration paths

### 2. Explore Design

- Join dimensions and fact tables appropriately
- Understand and use correct relationship types
- Use symmetric aggregates for one-to-many joins
- Apply sql_always_where for data filtering
- Set sensible always_filter defaults
- Use aggregate awareness for performance

### 3. Performance

- Use persistent derived tables for complex calculations
- Implement aggregate tables for common queries
- Set appropriate datagroups for caching
- Use indexes on PDT join keys
- Limit explore field exposure
- Monitor and optimize slow queries

### 4. Maintainability

- Use consistent naming conventions
- Organize views by domain
- Create reusable dimensions with extends
- Document complex logic
- Use refinements to avoid duplication
- Version control LookML in Git

### 5. Governance

- Implement access controls with user attributes
- Use field-level security for sensitive data
- Create curated explores for different audiences
- Document data lineage
- Establish naming standards

## Anti-Patterns

### 1. Symmetric Aggregate Issues

```lookml
# Bad: Incorrect fanout handling
measure: total_items {
  type: sum
  sql: ${order_items.quantity} ;;  # Will double-count with 1-to-many join
}

# Good: Use symmetric aggregates or subquery
measure: total_items {
  type: sum_distinct
  sql_distinct_key: ${order_items.id} ;;
  sql: ${order_items.quantity} ;;
}
```

### 2. Not Using Primary Keys

```lookml
# Bad: No primary key
view: users {
  dimension: id { type: number }
}

# Good: Define primary key
view: users {
  dimension: id {
    primary_key: yes
    type: number
  }
}
```

### 3. Hardcoded Values

```lookml
# Bad: Hardcoded logic
dimension: is_current_year {
  sql: YEAR(${created_date}) = 2024 ;;
}

# Good: Dynamic logic
dimension: is_current_year {
  sql: YEAR(${created_date}) = YEAR(CURRENT_DATE) ;;
}
```

### 4. Missing Descriptions

```lookml
# Bad: No documentation
dimension: ltv { type: number sql: ${TABLE}.ltv ;; }

# Good: Clear documentation
dimension: ltv {
  type: number
  sql: ${TABLE}.ltv ;;
  label: "Lifetime Value"
  description: "Total revenue from customer over all time"
  value_format_name: usd
}
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — LookML Basics, Advanced Dimensions and Measures, Persistent Derived Tables (PDTs), Explores and Joins, Parameters and Templated Filters, Dashboards, Access Control and Security

## Resources

- [LookML Reference](https://cloud.google.com/looker/docs/reference/lookml-quick-reference)
- [Looker Best Practices](https://cloud.google.com/looker/docs/best-practices)
- [Looker Community](https://community.looker.com/)
- [Looker Discourse](https://discourse.looker.com/)
- [LookML Validator](https://cloud.google.com/looker/docs/lookml-validation)
- [Looker API Documentation](https://cloud.google.com/looker/docs/reference/looker-api)
- [Looker GitHub](https://github.com/looker)
