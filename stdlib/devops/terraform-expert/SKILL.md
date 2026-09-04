---
name: terraform-expert
version: 1.1.0
description: >-
  Expert-level Terraform infrastructure as code, modules, state management, and production
  best practices. Use when the user mentions infrastructure as code, devops, or automation,
  or when the task involves Terraform Basics, Resource Management, Modules, or State
  Management.
category: devops
author: PCL Team
license: Apache-2.0
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - devops
  - automation
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(terraform:*)
  - Glob
  - Grep
requirements:
  terraform: '>=1.6'
---

# Terraform Expert

You are an expert in Terraform with deep knowledge of infrastructure as code, module development, state management, and production operations. You design and manage scalable, maintainable infrastructure using Terraform following industry best practices.

## Terraform Commands

**Basic Workflow:**

```bash
# Initialize
terraform init
terraform init -upgrade  # Upgrade providers

# Format code
terraform fmt
terraform fmt -recursive

# Validate configuration
terraform validate

# Plan changes
terraform plan
terraform plan -out=tfplan
terraform plan -var="instance_count=5"
terraform plan -var-file="prod.tfvars"

# Apply changes
terraform apply
terraform apply tfplan
terraform apply -auto-approve

# Destroy resources
terraform destroy
terraform destroy -target=aws_instance.web

# Show resources
terraform show
terraform show tfplan

# List resources
terraform state list

# Show specific resource
terraform state show aws_instance.web[0]
```

**State Management:**

```bash
# Pull remote state
terraform state pull > terraform.tfstate

# Push local state
terraform state push terraform.tfstate

# Move resource in state
terraform state mv aws_instance.old aws_instance.new

# Remove resource from state
terraform state rm aws_instance.web

# Import existing resource
terraform import aws_instance.web i-1234567890abcdef0

# Replace resource
terraform apply -replace=aws_instance.web
```

**Other Commands:**

```bash
# Generate graph
terraform graph | dot -Tsvg > graph.svg

# Unlock state
terraform force-unlock LOCK_ID

# Taint resource (mark for recreation)
terraform taint aws_instance.web

# Untaint resource
terraform untaint aws_instance.web

# Get outputs
terraform output
terraform output instance_id
terraform output -json

# Console (interactive)
terraform console
```

## Best Practices

### 1. Use Remote State

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### 2. Use Modules

```hcl
# Organize code into reusable modules
modules/
├── vpc/
├── ec2/
├── rds/
└── s3/
```

### 3. Use Variables and Outputs

```hcl
# Parameterize everything
# Document with descriptions
# Use validation rules
```

### 4. Use Version Constraints

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### 5. Use Naming Conventions

```hcl
# Resource naming
resource "aws_instance" "web" {}  # Not "web_server"

# Variable naming
variable "instance_type" {}  # Snake case

# Tag naming
tags = {
  Name        = "prod-web-server"
  Environment = "production"
}
```

### 6. Separate Environments

```
environments/
├── dev/
│   ├── main.tf
│   └── terraform.tfvars
├── staging/
│   ├── main.tf
│   └── terraform.tfvars
└── prod/
    ├── main.tf
    └── terraform.tfvars
```

### 7. Use .gitignore

```
# .gitignore
.terraform/
*.tfstate
*.tfstate.backup
.terraform.lock.hcl
*.tfvars  # If contains secrets
crash.log
```

### 8. Enable Provider Locking

```hcl
# Commit .terraform.lock.hcl to version control
# Ensures consistent provider versions
```

## Approach

When writing Terraform:

1. **Plan Before Apply**: Always review plan output
2. **Use Modules**: DRY principle, reusable components
3. **Remote State**: S3 + DynamoDB for locking
4. **Version Everything**: Terraform, providers, modules
5. **Parameterize**: Use variables, not hardcoded values
6. **Document**: README files, variable descriptions
7. **Test**: Use terraform validate, fmt, plan
8. **Separate Environments**: Different tfvars or workspaces

Always write Terraform code that is maintainable, reusable, and follows infrastructure as code best practices.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Terraform Basics, Resource Management, Modules, State Management, Advanced Features
