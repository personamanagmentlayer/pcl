# Databricks Expert — Core Expertise

Reference material for the `databricks-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Cluster Configuration and Management

**Cluster Types and Configuration:**

```python
# Databricks CLI - Create cluster
databricks clusters create --json '{
  "cluster_name": "data-engineering-cluster",
  "spark_version": "13.3.x-scala2.12",
  "node_type_id": "i3.xlarge",
  "driver_node_type_id": "i3.2xlarge",
  "num_workers": 4,
  "autoscale": {
    "min_workers": 2,
    "max_workers": 8
  },
  "autotermination_minutes": 120,
  "spark_conf": {
    "spark.sql.adaptive.enabled": "true",
    "spark.sql.adaptive.coalescePartitions.enabled": "true",
    "spark.databricks.delta.optimizeWrite.enabled": "true",
    "spark.databricks.delta.autoCompact.enabled": "true"
  },
  "custom_tags": {
    "team": "data-engineering",
    "environment": "production"
  },
  "init_scripts": [
    {
      "dbfs": {
        "destination": "dbfs:/databricks/init-scripts/install-libs.sh"
      }
    }
  ]
}'

# Job cluster configuration (optimized for cost)
job_cluster_config = {
    "spark_version": "13.3.x-scala2.12",
    "node_type_id": "i3.xlarge",
    "num_workers": 3,
    "spark_conf": {
        "spark.speculation": "true",
        "spark.task.maxFailures": "4"
    }
}

# High-concurrency cluster (for SQL Analytics)
high_concurrency_config = {
    "cluster_name": "sql-analytics-cluster",
    "spark_version": "13.3.x-sql-scala2.12",
    "node_type_id": "i3.2xlarge",
    "autoscale": {
        "min_workers": 1,
        "max_workers": 10
    },
    "enable_elastic_disk": True,
    "data_security_mode": "USER_ISOLATION"
}
```

**Instance Pools:**

```python
# Create instance pool
instance_pool_config = {
    "instance_pool_name": "production-pool",
    "min_idle_instances": 2,
    "max_capacity": 20,
    "node_type_id": "i3.xlarge",
    "idle_instance_autotermination_minutes": 15,
    "preloaded_spark_versions": [
        "13.3.x-scala2.12"
    ]
}

# Use instance pool in cluster
cluster_with_pool = {
    "cluster_name": "pool-cluster",
    "spark_version": "13.3.x-scala2.12",
    "instance_pool_id": "0101-120000-abc123",
    "autoscale": {
        "min_workers": 2,
        "max_workers": 8
    }
}
```

### Delta Lake Architecture

**Creating and Managing Delta Tables:**

```python
from pyspark.sql import SparkSession
from delta.tables import DeltaTable
from pyspark.sql.functions import col, current_timestamp, expr

spark = SparkSession.builder.getOrCreate()

# Create Delta table
df = spark.read.json("/mnt/raw/events")
df.write.format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .partitionBy("date", "event_type") \
    .save("/mnt/delta/events")

# Create managed table
df.write.format("delta") \
    .mode("overwrite") \
    .saveAsTable("production.events")

# Create table with SQL
spark.sql("""
    CREATE TABLE IF NOT EXISTS production.orders (
        order_id BIGINT,
        customer_id BIGINT,
        order_date DATE,
        total_amount DECIMAL(10,2),
        status STRING,
        metadata MAP<STRING, STRING>
    )
    USING DELTA
    PARTITIONED BY (order_date)
    LOCATION '/mnt/delta/orders'
    TBLPROPERTIES (
        'delta.autoOptimize.optimizeWrite' = 'true',
        'delta.autoOptimize.autoCompact' = 'true'
    )
""")

# Add constraints
spark.sql("""
    ALTER TABLE production.orders
    ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'cancelled'))
""")

# Add generated columns
spark.sql("""
    ALTER TABLE production.orders
    ADD COLUMN month INT GENERATED ALWAYS AS (MONTH(order_date))
""")
```

**MERGE Operations (Upserts):**

```python
# Upsert with Delta Lake
from delta.tables import DeltaTable

# Load Delta table
delta_table = DeltaTable.forPath(spark, "/mnt/delta/orders")

# New or updated data
updates_df = spark.read.format("parquet").load("/mnt/staging/order_updates")

# Merge (upsert)
delta_table.alias("target").merge(
    updates_df.alias("source"),
    "target.order_id = source.order_id"
).whenMatchedUpdate(
    condition="source.updated_at > target.updated_at",
    set={
        "total_amount": "source.total_amount",
        "status": "source.status",
        "updated_at": "source.updated_at"
    }
).whenNotMatchedInsert(
    values={
        "order_id": "source.order_id",
        "customer_id": "source.customer_id",
        "order_date": "source.order_date",
        "total_amount": "source.total_amount",
        "status": "source.status",
        "created_at": "source.created_at",
        "updated_at": "source.updated_at"
    }
).execute()

# Merge with delete
delta_table.alias("target").merge(
    updates_df.alias("source"),
    "target.order_id = source.order_id"
).whenMatchedUpdate(
    condition="source.is_active = true",
    set={"status": "source.status"}
).whenMatchedDelete(
    condition="source.is_active = false"
).whenNotMatchedInsert(
    values={
        "order_id": "source.order_id",
        "status": "source.status"
    }
).execute()
```

**Time Travel and Versioning:**

```python
# Query historical versions
df_v0 = spark.read.format("delta").option("versionAsOf", 0).load("/mnt/delta/orders")
df_yesterday = spark.read.format("delta") \
    .option("timestampAsOf", "2024-01-15") \
    .load("/mnt/delta/orders")

# View history
delta_table = DeltaTable.forPath(spark, "/mnt/delta/orders")
delta_table.history().show()

# Restore to previous version
delta_table.restoreToVersion(5)
delta_table.restoreToTimestamp("2024-01-15")

# Vacuum old files (delete files older than retention period)
delta_table.vacuum(168)  # 7 days in hours

# View table details
delta_table.detail().show()
```

**Optimization and Maintenance:**

```python
# Optimize table (compaction)
spark.sql("OPTIMIZE production.orders")

# Optimize with Z-Ordering
spark.sql("OPTIMIZE production.orders ZORDER BY (customer_id, status)")

# Analyze table for statistics
spark.sql("ANALYZE TABLE production.orders COMPUTE STATISTICS")

# Clone table (zero-copy)
spark.sql("""
    CREATE TABLE production.orders_clone
    SHALLOW CLONE production.orders
""")

# Deep clone (independent copy)
spark.sql("""
    CREATE TABLE production.orders_backup
    DEEP CLONE production.orders
""")

# Change Data Feed (CDC)
spark.sql("""
    ALTER TABLE production.orders
    SET TBLPROPERTIES (delta.enableChangeDataFeed = true)
""")

# Read changes
changes_df = spark.read.format("delta") \
    .option("readChangeFeed", "true") \
    .option("startingVersion", 5) \
    .table("production.orders")
```

### PySpark Data Processing

**DataFrame Operations:**

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# Read data
df = spark.read.format("delta").table("production.orders")

# Complex transformations
result = df \
    .filter(col("order_date") >= "2024-01-01") \
    .withColumn("year_month", F.date_format("order_date", "yyyy-MM")) \
    .withColumn("order_rank",
        F.row_number().over(
            Window.partitionBy("customer_id")
            .orderBy(F.desc("total_amount"))
        )
    ) \
    .groupBy("year_month", "status") \
    .agg(
        F.count("*").alias("order_count"),
        F.sum("total_amount").alias("total_revenue"),
        F.avg("total_amount").alias("avg_order_value"),
        F.percentile_approx("total_amount", 0.5).alias("median_amount")
    ) \
    .orderBy("year_month", "status")

# Write result
result.write.format("delta") \
    .mode("overwrite") \
    .option("replaceWhere", "year_month >= '2024-01'") \
    .saveAsTable("production.monthly_summary")

# JSON operations
json_df = df.withColumn("parsed_metadata", F.from_json("metadata", schema))
json_df = json_df.withColumn("tags", F.explode("parsed_metadata.tags"))

# Array and struct operations
df.withColumn("first_item", col("items").getItem(0)) \
  .withColumn("item_count", F.size("items")) \
  .withColumn("total_price",
      F.aggregate("items", F.lit(0),
                  lambda acc, x: acc + x.price))
```

**Advanced Spark SQL:**

```python
# Register temp view
df.createOrReplaceTempView("orders_temp")

# Complex SQL
result = spark.sql("""
    WITH customer_metrics AS (
        SELECT
            customer_id,
            COUNT(*) AS order_count,
            SUM(total_amount) AS lifetime_value,
            DATEDIFF(MAX(order_date), MIN(order_date)) AS customer_age_days,
            COLLECT_LIST(
                STRUCT(order_id, order_date, total_amount)
            ) AS order_history
        FROM orders_temp
        GROUP BY customer_id
    ),
    customer_segments AS (
        SELECT
            *,
            CASE
                WHEN lifetime_value >= 10000 THEN 'VIP'
                WHEN lifetime_value >= 5000 THEN 'Gold'
                WHEN lifetime_value >= 1000 THEN 'Silver'
                ELSE 'Bronze'
            END AS segment,
            NTILE(10) OVER (ORDER BY lifetime_value DESC) AS decile
        FROM customer_metrics
    )
    SELECT * FROM customer_segments
    WHERE segment IN ('VIP', 'Gold')
""")

# Window functions
spark.sql("""
    SELECT
        order_id,
        customer_id,
        order_date,
        total_amount,
        SUM(total_amount) OVER (
            PARTITION BY customer_id
            ORDER BY order_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_total,
        AVG(total_amount) OVER (
            PARTITION BY customer_id
            ORDER BY order_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS moving_avg_7_orders
    FROM orders_temp
""")
```

**Structured Streaming:**

```python
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType

# Define schema
schema = StructType([
    StructField("event_id", StringType()),
    StructField("user_id", StringType()),
    StructField("event_type", StringType()),
    StructField("timestamp", TimestampType()),
    StructField("value", DoubleType())
])

# Read stream from Kafka
stream_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "broker1:9092,broker2:9092") \
    .option("subscribe", "events") \
    .option("startingOffsets", "latest") \
    .load() \
    .select(F.from_json(F.col("value").cast("string"), schema).alias("data")) \
    .select("data.*")

# Process stream
processed_stream = stream_df \
    .withWatermark("timestamp", "10 minutes") \
    .groupBy(
        F.window("timestamp", "5 minutes", "1 minute"),
        "event_type"
    ) \
    .agg(
        F.count("*").alias("event_count"),
        F.sum("value").alias("total_value")
    )

# Write to Delta
query = processed_stream.writeStream \
    .format("delta") \
    .outputMode("append") \
    .option("checkpointLocation", "/mnt/checkpoints/events") \
    .option("mergeSchema", "true") \
    .trigger(processingTime="1 minute") \
    .table("production.event_metrics")

# Monitor streaming query
query.status
query.recentProgress
query.lastProgress
```

### MLflow Integration

**Experiment Tracking:**

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

# Set experiment
mlflow.set_experiment("/Users/data-science/customer-churn")

# Start run
with mlflow.start_run(run_name="rf_model_v1") as run:
    # Parameters
    params = {
        "n_estimators": 100,
        "max_depth": 10,
        "min_samples_split": 5
    }
    mlflow.log_params(params)

    # Train model
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    model = RandomForestClassifier(**params)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)

    # Log model
    mlflow.sklearn.log_model(model, "model")

    # Log artifacts
    mlflow.log_artifact("feature_importance.png")

    # Add tags
    mlflow.set_tags({
        "team": "data-science",
        "model_type": "classification"
    })

# Load model from run
run_id = run.info.run_id
model = mlflow.sklearn.load_model(f"runs:/{run_id}/model")

# Register model
model_uri = f"runs:/{run_id}/model"
mlflow.register_model(model_uri, "customer_churn_model")
```

**Model Registry and Deployment:**

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Transition model to staging
client.transition_model_version_stage(
    name="customer_churn_model",
    version=1,
    stage="Staging"
)

# Add model description
client.update_model_version(
    name="customer_churn_model",
    version=1,
    description="Random Forest model with hyperparameter tuning"
)

# Load production model
model = mlflow.pyfunc.load_model("models:/customer_churn_model/Production")

# Batch inference with Spark
model_udf = mlflow.pyfunc.spark_udf(
    spark,
    model_uri="models:/customer_churn_model/Production",
    result_type="double"
)

predictions = df.withColumn(
    "churn_prediction",
    model_udf(*feature_columns)
)
```

### Databricks Jobs and Workflows

**Job Configuration:**

```python
# Create job via API
job_config = {
    "name": "daily_etl_pipeline",
    "max_concurrent_runs": 1,
    "timeout_seconds": 3600,
    "schedule": {
        "quartz_cron_expression": "0 0 2 * * ?",
        "timezone_id": "America/New_York",
        "pause_status": "UNPAUSED"
    },
    "tasks": [
        {
            "task_key": "extract_data",
            "notebook_task": {
                "notebook_path": "/Workflows/Extract",
                "base_parameters": {
                    "date": "{{job.start_time.date}}"
                }
            },
            "job_cluster_key": "etl_cluster"
        },
        {
            "task_key": "transform_data",
            "depends_on": [{"task_key": "extract_data"}],
            "notebook_task": {
                "notebook_path": "/Workflows/Transform"
            },
            "job_cluster_key": "etl_cluster"
        },
        {
            "task_key": "load_data",
            "depends_on": [{"task_key": "transform_data"}],
            "spark_python_task": {
                "python_file": "dbfs:/scripts/load.py",
                "parameters": ["--env", "production"]
            },
            "job_cluster_key": "etl_cluster"
        }
    ],
    "job_clusters": [
        {
            "job_cluster_key": "etl_cluster",
            "new_cluster": {
                "spark_version": "13.3.x-scala2.12",
                "node_type_id": "i3.xlarge",
                "num_workers": 4
            }
        }
    ],
    "email_notifications": {
        "on_failure": ["data-eng@company.com"],
        "on_success": ["data-eng@company.com"]
    }
}
```

**Notebook Utilities:**

```python
# Get parameters
date_param = dbutils.widgets.get("date")

# Exit notebook with value
dbutils.notebook.exit("success")

# Run another notebook
result = dbutils.notebook.run(
    "/Shared/ProcessData",
    timeout_seconds=600,
    arguments={"date": "2024-01-15"}
)

# Access secrets
api_key = dbutils.secrets.get(scope="production", key="api_key")

# File system operations
dbutils.fs.ls("/mnt/data")
dbutils.fs.cp("/mnt/source/file.csv", "/mnt/dest/file.csv")
dbutils.fs.rm("/mnt/data/temp", recurse=True)
```

### Unity Catalog

**Catalog and Schema Management:**

```python
# Create catalog
spark.sql("CREATE CATALOG IF NOT EXISTS production")

# Create schema
spark.sql("""
    CREATE SCHEMA IF NOT EXISTS production.sales
    COMMENT 'Sales data'
    LOCATION '/mnt/unity-catalog/sales'
""")

# Grant privileges
spark.sql("GRANT USE CATALOG ON CATALOG production TO `data-engineers`")
spark.sql("GRANT ALL PRIVILEGES ON SCHEMA production.sales TO `data-engineers`")
spark.sql("GRANT SELECT ON TABLE production.sales.orders TO `data-analysts`")

# Three-level namespace
spark.sql("SELECT * FROM production.sales.orders")

# External locations
spark.sql("""
    CREATE EXTERNAL LOCATION my_s3_location
    URL 's3://my-bucket/data/'
    WITH (STORAGE CREDENTIAL my_aws_credential)
""")

# Data lineage (automatic tracking)
spark.sql("SELECT * FROM production.sales.orders").show()
# View lineage in Unity Catalog UI
```
