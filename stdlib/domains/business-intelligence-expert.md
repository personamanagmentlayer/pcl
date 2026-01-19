# Business Intelligence Expert

---
skill_id: business-intelligence-expert
name: Business Intelligence Expert
category: domains
tags: [bi, business-intelligence, data-warehouse, reporting, dashboards, data-visualization, analytics, olap]
version: 1.0.0
author: PCL Standard Library
dependencies: []
complexity: expert
estimated_time: 45 minutes
objectives:
  - Master business intelligence platforms and architectures
  - Understand data warehousing and ETL processes
  - Implement reporting and dashboard solutions
  - Apply data visualization best practices
  - Navigate OLAP and multidimensional analysis
prerequisites:
  - Understanding of database systems and SQL
  - Knowledge of data modeling concepts
  - Familiarity with reporting tools
  - Experience with data analysis and metrics
outcome: Build comprehensive business intelligence solutions including data warehouses, ETL pipelines, interactive dashboards, and analytical reporting systems
---

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

## Code Examples

### Data Warehouse Core System

```python
from datetime import datetime, date, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
from decimal import Decimal
import uuid

class GranularityLevel(Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

class AggregationType(Enum):
    SUM = "sum"
    AVG = "average"
    COUNT = "count"
    MIN = "minimum"
    MAX = "maximum"

@dataclass
class DimensionTable:
    dimension_id: str
    name: str
    attributes: Dict[str, str]  # attribute_name -> data_type
    hierarchy_levels: List[str] = field(default_factory=list)
    records: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class FactTable:
    fact_id: str
    name: str
    dimensions: List[str]  # dimension_ids
    measures: Dict[str, str]  # measure_name -> data_type
    grain: str  # Level of detail
    records: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Cube:
    cube_id: str
    name: str
    fact_table_id: str
    dimensions: List[str]
    measures: List[str]
    aggregations: Dict[str, Dict] = field(default_factory=dict)

@dataclass
class Report:
    report_id: str
    name: str
    description: str
    cube_id: str
    dimensions_used: List[str]
    measures_used: List[str]
    filters: Dict[str, Any] = field(default_factory=dict)
    created_by: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    last_run: Optional[datetime] = None

class DataWarehouse:
    def __init__(self):
        self.dimensions: Dict[str, DimensionTable] = {}
        self.facts: Dict[str, FactTable] = {}
        self.cubes: Dict[str, Cube] = {}

    def create_dimension(self, dim_data: Dict) -> DimensionTable:
        """Create dimension table"""
        dimension = DimensionTable(
            dimension_id=dim_data.get('dimension_id', str(uuid.uuid4())),
            name=dim_data['name'],
            attributes=dim_data['attributes'],
            hierarchy_levels=dim_data.get('hierarchy_levels', [])
        )

        self.dimensions[dimension.dimension_id] = dimension
        return dimension

    def create_fact_table(self, fact_data: Dict) -> FactTable:
        """Create fact table"""
        fact = FactTable(
            fact_id=fact_data.get('fact_id', str(uuid.uuid4())),
            name=fact_data['name'],
            dimensions=fact_data['dimensions'],
            measures=fact_data['measures'],
            grain=fact_data['grain']
        )

        self.facts[fact.fact_id] = fact
        return fact

    def add_dimension_record(self, dimension_id: str, record: Dict):
        """Add record to dimension table"""
        dimension = self.dimensions.get(dimension_id)
        if not dimension:
            raise ValueError("Dimension not found")

        # Add surrogate key if not present
        if 'dimension_key' not in record:
            record['dimension_key'] = len(dimension.records) + 1

        dimension.records.append(record)

    def add_fact_record(self, fact_id: str, record: Dict):
        """Add record to fact table"""
        fact = self.facts.get(fact_id)
        if not fact:
            raise ValueError("Fact table not found")

        # Validate dimension keys exist
        for dim_id in fact.dimensions:
            dim_key_field = f"{self.dimensions[dim_id].name}_key"
            if dim_key_field not in record:
                raise ValueError(f"Missing dimension key: {dim_key_field}")

        fact.records.append(record)

    def create_cube(self, cube_data: Dict) -> Cube:
        """Create OLAP cube"""
        cube = Cube(
            cube_id=str(uuid.uuid4()),
            name=cube_data['name'],
            fact_table_id=cube_data['fact_table_id'],
            dimensions=cube_data['dimensions'],
            measures=cube_data['measures']
        )

        self.cubes[cube.cube_id] = cube

        # Pre-aggregate common combinations
        self._build_aggregations(cube)

        return cube

    def _build_aggregations(self, cube: Cube):
        """Build cube aggregations"""
        fact = self.facts[cube.fact_table_id]

        # Build aggregations at different granularities
        # This is simplified - production would use more sophisticated aggregation
        for measure in cube.measures:
            cube.aggregations[measure] = {
                'total': self._aggregate_measure(fact, measure, AggregationType.SUM),
                'by_dimension': {}
            }

            # Aggregate by each dimension
            for dim_id in cube.dimensions:
                dim = self.dimensions[dim_id]
                cube.aggregations[measure]['by_dimension'][dim.name] = \
                    self._aggregate_by_dimension(fact, measure, dim)

    def _aggregate_measure(self, fact: FactTable, measure: str,
                          agg_type: AggregationType) -> float:
        """Aggregate measure across all records"""
        values = [record.get(measure, 0) for record in fact.records]

        if agg_type == AggregationType.SUM:
            return sum(values)
        elif agg_type == AggregationType.AVG:
            return sum(values) / len(values) if values else 0
        elif agg_type == AggregationType.COUNT:
            return len(values)
        elif agg_type == AggregationType.MIN:
            return min(values) if values else 0
        elif agg_type == AggregationType.MAX:
            return max(values) if values else 0

        return 0

    def _aggregate_by_dimension(self, fact: FactTable, measure: str,
                               dimension: DimensionTable) -> Dict:
        """Aggregate measure by dimension values"""
        aggregations = {}
        dim_key_field = f"{dimension.name}_key"

        for record in fact.records:
            dim_key = record.get(dim_key_field)
            if dim_key not in aggregations:
                aggregations[dim_key] = []

            aggregations[dim_key].append(record.get(measure, 0))

        # Calculate aggregates
        result = {}
        for dim_key, values in aggregations.items():
            result[dim_key] = {
                'sum': sum(values),
                'avg': sum(values) / len(values) if values else 0,
                'count': len(values)
            }

        return result

    def query_cube(self, cube_id: str, dimensions: List[str],
                  measures: List[str], filters: Dict = None) -> List[Dict]:
        """Query OLAP cube"""
        cube = self.cubes.get(cube_id)
        if not cube:
            return []

        fact = self.facts[cube.fact_table_id]
        results = []

        # Filter records
        filtered_records = fact.records
        if filters:
            filtered_records = [r for r in filtered_records
                              if self._apply_filters(r, filters)]

        # Group by dimensions and aggregate measures
        groups = {}
        for record in filtered_records:
            # Create group key from dimension values
            group_key = tuple(record.get(f"{dim}_key") for dim in dimensions)

            if group_key not in groups:
                groups[group_key] = {
                    'dimensions': {dim: record.get(f"{dim}_key")
                                 for dim in dimensions},
                    'measures': {measure: [] for measure in measures}
                }

            # Add measures to group
            for measure in measures:
                groups[group_key]['measures'][measure].append(
                    record.get(measure, 0)
                )

        # Calculate aggregates
        for group_data in groups.values():
            result = dict(group_data['dimensions'])
            for measure, values in group_data['measures'].items():
                result[f"{measure}_sum"] = sum(values)
                result[f"{measure}_avg"] = sum(values) / len(values) if values else 0
                result[f"{measure}_count"] = len(values)

            results.append(result)

        return results

    def _apply_filters(self, record: Dict, filters: Dict) -> bool:
        """Apply filter conditions to record"""
        for field, condition in filters.items():
            if isinstance(condition, dict):
                operator = condition.get('operator')
                value = condition.get('value')

                record_value = record.get(field)

                if operator == 'eq' and record_value != value:
                    return False
                elif operator == 'gt' and record_value <= value:
                    return False
                elif operator == 'lt' and record_value >= value:
                    return False
                elif operator == 'in' and record_value not in value:
                    return False
            else:
                if record.get(field) != condition:
                    return False

        return True
```

### ETL Pipeline System

```python
from typing import Callable, List, Dict, Any
from datetime import datetime

class ETLStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class DataSource:
    source_id: str
    name: str
    source_type: str  # database, api, file, stream
    connection_info: Dict[str, Any]
    schema: Dict[str, str]  # field_name -> data_type

@dataclass
class TransformationRule:
    rule_id: str
    name: str
    rule_type: str  # filter, map, aggregate, join, validate
    configuration: Dict[str, Any]
    order: int

@dataclass
class ETLJob:
    job_id: str
    name: str
    description: str
    source_id: str
    target_id: str
    transformations: List[str]  # transformation_rule_ids
    schedule: str  # cron expression
    enabled: bool = True
    last_run: Optional[datetime] = None
    last_status: Optional[ETLStatus] = None

@dataclass
class ETLExecution:
    execution_id: str
    job_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: ETLStatus = ETLStatus.PENDING
    records_extracted: int = 0
    records_transformed: int = 0
    records_loaded: int = 0
    errors: List[str] = field(default_factory=list)

class ETLPipeline:
    def __init__(self):
        self.sources: Dict[str, DataSource] = {}
        self.transformation_rules: Dict[str, TransformationRule] = {}
        self.jobs: Dict[str, ETLJob] = {}
        self.executions: List[ETLExecution] = []

    def register_source(self, source_data: Dict) -> DataSource:
        """Register data source"""
        source = DataSource(
            source_id=str(uuid.uuid4()),
            name=source_data['name'],
            source_type=source_data['source_type'],
            connection_info=source_data['connection_info'],
            schema=source_data['schema']
        )

        self.sources[source.source_id] = source
        return source

    def create_transformation_rule(self, rule_data: Dict) -> TransformationRule:
        """Define transformation rule"""
        rule = TransformationRule(
            rule_id=str(uuid.uuid4()),
            name=rule_data['name'],
            rule_type=rule_data['rule_type'],
            configuration=rule_data['configuration'],
            order=rule_data.get('order', 0)
        )

        self.transformation_rules[rule.rule_id] = rule
        return rule

    def create_job(self, job_data: Dict) -> ETLJob:
        """Create ETL job"""
        job = ETLJob(
            job_id=str(uuid.uuid4()),
            name=job_data['name'],
            description=job_data['description'],
            source_id=job_data['source_id'],
            target_id=job_data['target_id'],
            transformations=job_data['transformations'],
            schedule=job_data['schedule']
        )

        self.jobs[job.job_id] = job
        return job

    def execute_job(self, job_id: str) -> ETLExecution:
        """Execute ETL job"""
        job = self.jobs.get(job_id)
        if not job:
            raise ValueError("Job not found")

        execution = ETLExecution(
            execution_id=str(uuid.uuid4()),
            job_id=job_id,
            start_time=datetime.now(),
            status=ETLStatus.RUNNING
        )

        self.executions.append(execution)

        try:
            # Extract
            source_data = self._extract_data(job.source_id)
            execution.records_extracted = len(source_data)

            # Transform
            transformed_data = self._transform_data(
                source_data,
                job.transformations
            )
            execution.records_transformed = len(transformed_data)

            # Load
            self._load_data(job.target_id, transformed_data)
            execution.records_loaded = len(transformed_data)

            execution.status = ETLStatus.SUCCESS

        except Exception as e:
            execution.status = ETLStatus.FAILED
            execution.errors.append(str(e))

        execution.end_time = datetime.now()

        # Update job
        job.last_run = execution.start_time
        job.last_status = execution.status

        return execution

    def _extract_data(self, source_id: str) -> List[Dict]:
        """Extract data from source"""
        source = self.sources.get(source_id)
        if not source:
            return []

        # In production, would connect to actual data source
        # This is a placeholder
        return []

    def _transform_data(self, data: List[Dict],
                       transformation_ids: List[str]) -> List[Dict]:
        """Apply transformations to data"""
        # Sort transformations by order
        transformations = [self.transformation_rules[tid]
                         for tid in transformation_ids
                         if tid in self.transformation_rules]
        transformations.sort(key=lambda t: t.order)

        result = data

        for transformation in transformations:
            if transformation.rule_type == "filter":
                result = self._apply_filter(result, transformation.configuration)
            elif transformation.rule_type == "map":
                result = self._apply_mapping(result, transformation.configuration)
            elif transformation.rule_type == "validate":
                result = self._apply_validation(result, transformation.configuration)

        return result

    def _apply_filter(self, data: List[Dict], config: Dict) -> List[Dict]:
        """Filter records based on conditions"""
        field = config.get('field')
        operator = config.get('operator')
        value = config.get('value')

        filtered = []
        for record in data:
            record_value = record.get(field)

            if operator == 'eq' and record_value == value:
                filtered.append(record)
            elif operator == 'ne' and record_value != value:
                filtered.append(record)
            elif operator == 'gt' and record_value > value:
                filtered.append(record)

        return filtered

    def _apply_mapping(self, data: List[Dict], config: Dict) -> List[Dict]:
        """Map fields to new names or transform values"""
        field_mappings = config.get('mappings', {})

        mapped = []
        for record in data:
            new_record = {}
            for old_field, new_field in field_mappings.items():
                if old_field in record:
                    new_record[new_field] = record[old_field]

            mapped.append(new_record)

        return mapped

    def _apply_validation(self, data: List[Dict], config: Dict) -> List[Dict]:
        """Validate data quality"""
        required_fields = config.get('required_fields', [])
        valid = []

        for record in data:
            if all(field in record and record[field] is not None
                  for field in required_fields):
                valid.append(record)

        return valid

    def _load_data(self, target_id: str, data: List[Dict]):
        """Load data into target"""
        # In production, would load into actual target system
        pass

    def get_job_metrics(self, job_id: str) -> Dict[str, Any]:
        """Get ETL job execution metrics"""
        job_executions = [e for e in self.executions if e.job_id == job_id]

        if not job_executions:
            return {'job_id': job_id, 'total_executions': 0}

        successful = [e for e in job_executions if e.status == ETLStatus.SUCCESS]
        failed = [e for e in job_executions if e.status == ETLStatus.FAILED]

        total_records = sum(e.records_loaded for e in successful)

        return {
            'job_id': job_id,
            'total_executions': len(job_executions),
            'successful': len(successful),
            'failed': len(failed),
            'success_rate': (len(successful) / len(job_executions) * 100),
            'total_records_loaded': total_records,
            'last_execution': job_executions[-1].start_time if job_executions else None
        }
```

### Dashboard & Visualization System

```python
class ChartType(Enum):
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    SCATTER = "scatter"
    TABLE = "table"
    KPI = "kpi"

@dataclass
class Visualization:
    viz_id: str
    name: str
    chart_type: ChartType
    data_source: str  # cube_id or query
    dimensions: List[str]
    measures: List[str]
    filters: Dict[str, Any] = field(default_factory=dict)
    formatting: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Dashboard:
    dashboard_id: str
    name: str
    description: str
    visualizations: List[str]  # viz_ids
    layout: Dict[str, Any]  # grid layout configuration
    refresh_schedule: Optional[str] = None
    created_by: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    shared_with: List[str] = field(default_factory=list)

class BIDashboardSystem:
    def __init__(self, data_warehouse: DataWarehouse):
        self.dw = data_warehouse
        self.visualizations: Dict[str, Visualization] = {}
        self.dashboards: Dict[str, Dashboard] = {}

    def create_visualization(self, viz_data: Dict) -> Visualization:
        """Create data visualization"""
        viz = Visualization(
            viz_id=str(uuid.uuid4()),
            name=viz_data['name'],
            chart_type=ChartType(viz_data['chart_type']),
            data_source=viz_data['data_source'],
            dimensions=viz_data['dimensions'],
            measures=viz_data['measures'],
            filters=viz_data.get('filters', {}),
            formatting=viz_data.get('formatting', {})
        )

        self.visualizations[viz.viz_id] = viz
        return viz

    def create_dashboard(self, dashboard_data: Dict) -> Dashboard:
        """Create dashboard"""
        dashboard = Dashboard(
            dashboard_id=str(uuid.uuid4()),
            name=dashboard_data['name'],
            description=dashboard_data['description'],
            visualizations=dashboard_data['visualizations'],
            layout=dashboard_data.get('layout', {}),
            refresh_schedule=dashboard_data.get('refresh_schedule'),
            created_by=dashboard_data['created_by']
        )

        self.dashboards[dashboard.dashboard_id] = dashboard
        return dashboard

    def render_visualization(self, viz_id: str) -> Dict[str, Any]:
        """Render visualization data"""
        viz = self.visualizations.get(viz_id)
        if not viz:
            return {}

        # Query data warehouse
        data = self.dw.query_cube(
            viz.data_source,
            viz.dimensions,
            viz.measures,
            viz.filters
        )

        # Format for chart type
        if viz.chart_type == ChartType.LINE:
            return self._format_line_chart(data, viz)
        elif viz.chart_type == ChartType.BAR:
            return self._format_bar_chart(data, viz)
        elif viz.chart_type == ChartType.PIE:
            return self._format_pie_chart(data, viz)
        elif viz.chart_type == ChartType.KPI:
            return self._format_kpi(data, viz)

        return {'type': viz.chart_type.value, 'data': data}

    def _format_line_chart(self, data: List[Dict], viz: Visualization) -> Dict:
        """Format data for line chart"""
        # Assume first dimension is X-axis
        x_field = viz.dimensions[0] if viz.dimensions else None
        y_fields = [f"{m}_sum" for m in viz.measures]

        series = []
        for y_field in y_fields:
            series.append({
                'name': y_field,
                'data': [
                    {'x': record.get(x_field), 'y': record.get(y_field)}
                    for record in data
                ]
            })

        return {
            'type': 'line',
            'series': series,
            'xAxis': {'field': x_field},
            'yAxis': {'fields': y_fields}
        }

    def _format_bar_chart(self, data: List[Dict], viz: Visualization) -> Dict:
        """Format data for bar chart"""
        categories = [record.get(viz.dimensions[0]) for record in data]
        series = []

        for measure in viz.measures:
            series.append({
                'name': measure,
                'data': [record.get(f"{measure}_sum") for record in data]
            })

        return {
            'type': 'bar',
            'categories': categories,
            'series': series
        }

    def _format_pie_chart(self, data: List[Dict], viz: Visualization) -> Dict:
        """Format data for pie chart"""
        measure = f"{viz.measures[0]}_sum"
        dimension = viz.dimensions[0]

        pie_data = [
            {
                'name': record.get(dimension),
                'value': record.get(measure)
            }
            for record in data
        ]

        return {
            'type': 'pie',
            'data': pie_data
        }

    def _format_kpi(self, data: List[Dict], viz: Visualization) -> Dict:
        """Format data for KPI display"""
        measure = f"{viz.measures[0]}_sum"

        # Calculate total
        total = sum(record.get(measure, 0) for record in data)

        return {
            'type': 'kpi',
            'value': total,
            'measure': viz.measures[0],
            'formatting': viz.formatting
        }

    def get_dashboard_data(self, dashboard_id: str) -> Dict[str, Any]:
        """Get complete dashboard data"""
        dashboard = self.dashboards.get(dashboard_id)
        if not dashboard:
            return {}

        visualizations_data = {}
        for viz_id in dashboard.visualizations:
            visualizations_data[viz_id] = self.render_visualization(viz_id)

        return {
            'dashboard_id': dashboard_id,
            'name': dashboard.name,
            'description': dashboard.description,
            'layout': dashboard.layout,
            'visualizations': visualizations_data,
            'last_refreshed': datetime.now()
        }
```

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

*Part of the PCL Standard Library - Master business intelligence systems and transform data into actionable insights for strategic decision-making.*

*CONGRATULATIONS! This is skill #100, completing the PCL Standard Library with comprehensive coverage across all major business and technology domains!*
