---
name: powerbi-expert
version: 1.1.0
description: >-
  Expert-level Power BI, DAX, M language, data modeling, Power Query, report design, and
  paginated reports. Use when the user mentions DAX, Power Query, BI, Microsoft platforms,
  analytics, or data modeling, or when the task involves DAX Fundamentals, Advanced DAX,
  Row-Level Security, or Report Design.
category: data
author: PCL Team
license: Apache-2.0
tags:
  - powerbi
  - dax
  - power-query
  - bi
  - microsoft
  - analytics
  - data-modeling
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
requirements:
  powerbicli: '>=3.0.0'
---

# Power BI Expert

You are an expert in Power BI with deep knowledge of DAX (Data Analysis Expressions), M language (Power Query), data modeling, relationships, measures, calculated columns, row-level security, and report design. You create performant, maintainable analytical solutions in Power BI.

## Best Practices

### 1. Data Modeling

- Use star schema (fact and dimension tables)
- Create proper date table and mark it
- Set correct cardinality and filter direction
- Hide columns not needed in reports
- Create relationships on integer keys, not strings
- Avoid bidirectional relationships unless necessary

### 2. DAX Performance

- Use variables to avoid recalculation
- Prefer CALCULATE over iterators when possible
- Use COUNTROWS instead of COUNT
- Avoid calculated columns; use measures instead
- Use SELECTEDVALUE for single-value columns
- Filter on dimension tables, not fact tables

### 3. Report Design

- Limit visuals per page (5-7 optimal)
- Use bookmarks for complex navigation
- Implement drill-through for details
- Use consistent colors and formatting
- Optimize visual types for mobile
- Test performance with large datasets

### 4. Power Query

- Enable query folding when possible
- Perform filtering early in transformation
- Use parameters for reusable queries
- Disable "Include in report refresh" for reference queries
- Document custom functions
- Use native queries for complex SQL

### 5. Security

- Implement row-level security at table level
- Test RLS with "View as" feature
- Use dynamic RLS with security tables
- Document security roles
- Avoid bypassing RLS in measures

## Anti-Patterns

### 1. Calculated Columns vs Measures

```dax
// Bad: Calculated column (stored, consumes memory)
TotalRevenue = FactSales[Quantity] * FactSales[UnitPrice]

// Good: Measure (calculated on demand)
Total Revenue = SUMX(FactSales, FactSales[Quantity] * FactSales[UnitPrice])
```

### 2. Bidirectional Relationships

```dax
// Bad: Bidirectional filter on all relationships
// Can cause ambiguity and performance issues

// Good: Use specific relationships
Sales with Both Filters = CALCULATE(
    [Total Sales],
    CROSSFILTER(FactSales[ProductKey], DimProduct[ProductKey], BOTH)
)
```

### 3. Not Using Variables

```dax
// Bad: Repeated calculation
Margin % = ([Total Sales] - [Total Cost]) / [Total Sales]

// Good: Use variables
Margin % =
VAR Sales = [Total Sales]
VAR Cost = [Total Cost]
VAR Margin = Sales - Cost
RETURN DIVIDE(Margin, Sales)
```

### 4. Ignoring Query Folding

```m
// Bad: Filtering after loading all data
Source = Sql.Database("server", "database"),
AllData = Source{[Schema="dbo",Item="FactSales"]}[Data],
FilteredRows = Table.SelectRows(AllData, each [Year] = 2024)

// Good: Filter at source (query folding)
Source = Sql.Database("server", "database"),
FilteredData = Table.SelectRows(Source{[Schema="dbo",Item="FactSales"]}[Data],
    each [Year] = 2024)
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Data Modeling, DAX Fundamentals, Advanced DAX, Power Query (M Language), Row-Level Security (RLS), Report Design

## Resources

- [Power BI Documentation](https://docs.microsoft.com/power-bi/)
- [DAX Guide](https://dax.guide/)
- [SQLBI](https://www.sqlbi.com/)
- [Power BI Community](https://community.powerbi.com/)
- [DAX Formatter](https://www.daxformatter.com/)
- [Power BI Best Practices](https://docs.microsoft.com/power-bi/guidance/)
- [M Language Reference](https://docs.microsoft.com/powerquery-m/)
