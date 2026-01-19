# Phase 3: Data & Analytics Expert Skills

## Overview

Phase 3 of the PCL Standard Library focuses on enterprise-grade data engineering, analytics, and business intelligence. This phase includes 8 comprehensive expert skills covering modern data platforms, orchestration, transformation, visualization, and architectural patterns.

## Skills Created

### 1. **snowflake-expert** (702 lines)
**Location:** `stdlib/data/snowflake-expert/SKILL.md`

Comprehensive Snowflake data warehouse expertise including:
- Virtual warehouse management and resource monitors
- Multi-cluster architecture and database objects
- Data loading with stages, COPY, and Snowpipe
- Streams and Tasks for CDC and automation
- Time Travel and Zero-Copy Cloning
- Secure data sharing and access control
- Advanced SQL optimization and semi-structured data
- Performance tuning and cost optimization

**Key Features:**
- Enterprise-scale virtual warehouse configuration
- Continuous data loading with Snowpipe
- Change data capture with streams
- Row-level and column-level security
- Query optimization techniques

---

### 2. **databricks-expert** (741 lines)
**Location:** `stdlib/data/databricks-expert/SKILL.md`

Deep Databricks platform knowledge covering:
- Cluster configuration and instance pools
- Delta Lake architecture and ACID transactions
- PySpark data processing and Structured Streaming
- MLflow experiment tracking and model registry
- Databricks Jobs and Workflows
- Unity Catalog for data governance
- Performance optimization with Photon

**Key Features:**
- Delta Lake MERGE operations (upserts)
- Incremental table processing
- Advanced Spark SQL and window functions
- ML model lifecycle management
- Three-level namespace with Unity Catalog

---

### 3. **airflow-expert** (880 lines)
**Location:** `stdlib/data/airflow-expert/SKILL.md`

Expert Apache Airflow orchestration including:
- DAG fundamentals and TaskFlow API
- Task dependencies and branching logic
- Dynamic task generation and mapping
- Operators and Sensors for various systems
- XComs and task communication
- Connections, Variables, and Parameters
- Error handling, retries, and callbacks
- Production best practices and monitoring

**Key Features:**
- Modern TaskFlow API patterns
- Complex dependency management
- Dynamic workflow generation
- Comprehensive error handling
- Production-ready DAG design

---

### 4. **dbt-expert** (943 lines)
**Location:** `stdlib/data/dbt-expert/SKILL.md`

Analytics engineering with dbt covering:
- Project structure and configuration
- Sources and staging models
- Intermediate and mart models (medallion architecture)
- Incremental models for large datasets
- Schema and custom tests
- Reusable macros and Jinja templating
- Snapshots for SCD Type 2
- Documentation and packages

**Key Features:**
- Staging -> Intermediate -> Marts pattern
- Incremental loading strategies
- Comprehensive testing framework
- Advanced Jinja macros
- Data lineage and documentation

---

### 5. **looker-expert** (928 lines)
**Location:** `stdlib/data/looker-expert/SKILL.md`

LookML and Looker BI expertise including:
- View and model definitions
- Advanced dimensions and measures
- Persistent Derived Tables (PDTs)
- Explores and join patterns
- Parameters and templated filters
- Dashboard design and interactivity
- Access control and row-level security
- Field-level security with access grants

**Key Features:**
- Semantic data modeling with LookML
- PDT for complex calculations
- Dynamic parameters and metrics
- Aggregate awareness for performance
- Fine-grained security controls

---

### 6. **tableau-expert** (760 lines)
**Location:** `stdlib/data/tableau-expert/SKILL.md`

Tableau Desktop/Server mastery covering:
- Calculated fields and complex logic
- Level of Detail (LOD) expressions (FIXED, INCLUDE, EXCLUDE)
- Parameters and dynamic calculations
- Data blending and relationships
- Dashboard design best practices
- Table calculations and window functions
- Extracts and performance optimization
- Sets and advanced analytics

**Key Features:**
- LOD expressions for complex aggregations
- Dynamic dashboards with parameters
- Performance optimization techniques
- Multi-fact analysis with relationships
- Advanced analytics pane features

---

### 7. **powerbi-expert** (863 lines)
**Location:** `stdlib/data/powerbi-expert/SKILL.md`

Power BI expertise with DAX and M language:
- Data modeling and star schema design
- DAX fundamentals and CALCULATE function
- Time intelligence and iterator functions
- Advanced DAX with variables and SWITCH
- Power Query (M language) transformations
- Row-level security (RLS)
- Report design and visualizations
- Performance optimization

**Key Features:**
- Comprehensive DAX patterns
- Time intelligence calculations
- Dynamic M language transformations
- Role-based security implementation
- Optimized data models

---

### 8. **data-mesh-expert** (1022 lines)
**Location:** `stdlib/data/data-mesh-expert/SKILL.md`

Data mesh architecture expertise covering:
- Four foundational principles
- Domain-oriented data ownership
- Data as a Product with contracts and SLAs
- Self-serve data infrastructure platform
- Federated computational governance
- Data product implementation patterns
- Platform APIs and automation
- Governance engine and policy enforcement

**Key Features:**
- Domain decomposition patterns
- Data product contracts and versioning
- Self-serve platform design
- Automated governance policies
- Platform API implementations

## Statistics

- **Total Skills:** 8
- **Total Lines:** 6,839
- **Average Lines per Skill:** 855
- **Domains Covered:**
  - Data Warehousing (Snowflake)
  - Lakehouse Architecture (Databricks)
  - Orchestration (Airflow)
  - Analytics Engineering (dbt)
  - Business Intelligence (Looker, Tableau, Power BI)
  - Architecture (Data Mesh)

## Integration Points

These skills integrate with existing PCL Standard Library components:

### Data Skills (Phase 1)
- `sql-expert` - Foundation for all SQL-based platforms
- `postgresql-expert` - Source systems for data pipelines
- `mongodb-expert` - NoSQL data sources
- `kafka-expert` - Streaming data integration
- `elasticsearch-expert` - Search and analytics

### Cloud Skills
- AWS, Azure, GCP integration for cloud-native deployments
- S3, Blob Storage, GCS for data lakes
- Cloud data warehouses (Snowflake, Redshift, BigQuery)

### DevOps Skills
- Docker for containerized data applications
- Kubernetes for orchestration platforms
- CI/CD for data pipeline deployment
- Terraform for infrastructure as code

## Usage Examples

### Data Pipeline with Airflow + dbt
```python
# Airflow DAG
@dag(schedule='@daily')
def data_pipeline():
    @task
    def extract():
        # Extract with Snowflake
        pass

    @task
    def transform():
        # Transform with dbt
        pass

    @task
    def load():
        # Load to data warehouse
        pass
```

### Analytics with Databricks + MLflow
```python
# Databricks notebook
df = spark.read.format("delta").table("sales")
with mlflow.start_run():
    model = train_model(df)
    mlflow.log_metrics({"accuracy": 0.95})
```

### BI with Looker
```lookml
explore: orders {
  join: customers {
    sql_on: ${orders.customer_id} = ${customers.id} ;;
    relationship: many_to_one
  }
}
```

### Data Mesh Implementation
```python
# Create data product
platform = DataMeshPlatform()
product_id = platform.create_data_product(
    DataProductSpec(
        name="sales_orders",
        domain="sales",
        schedule="@daily"
    )
)
```

## Best Practices Covered

Each skill includes comprehensive best practices for:
- **Performance:** Query optimization, caching, partitioning
- **Scalability:** Cluster sizing, parallel processing, incremental loads
- **Maintainability:** Documentation, testing, version control
- **Security:** Access control, encryption, audit logging
- **Governance:** Data quality, lineage, compliance
- **Cost Optimization:** Resource management, storage lifecycle

## Anti-Patterns Documented

All skills document common anti-patterns and how to avoid them:
- Inefficient query patterns
- Poor data modeling choices
- Security vulnerabilities
- Performance bottlenecks
- Maintenance nightmares

## Resources

Each skill provides curated resources:
- Official documentation links
- Community forums and support
- Best practice guides
- Training and certification paths
- GitHub repositories and examples

## Next Steps

### Phase 4: Advanced Topics (Suggested)
- Machine Learning (TensorFlow, PyTorch)
- Real-time Analytics (Flink, Storm)
- Graph Databases (Neo4j)
- Vector Databases (Pinecone, Weaviate)
- Data Quality (Great Expectations, Soda)

### Integration Tasks
- Create cross-skill example workflows
- Build reference architectures
- Develop integration testing patterns
- Document migration paths

## Completion

Phase 3: Data & Analytics is now **COMPLETE** with all 8 expert skills implemented.

**Created:** 2024-01-19
**Status:** ✅ Complete
**Skills:** 8/8 (100%)
**Total Content:** 6,839 lines of expert knowledge
