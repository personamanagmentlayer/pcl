---
name: openapi-expert
version: 1.1.0
description: >-
  Expert-level OpenAPI/Swagger specification for API design, documentation, and code
  generation. Use when the user mentions swagger, API specs, REST, API design, or
  documentation, or when the task involves OpenAPI Specification, Webhooks, or
  Polymorphism.
category: api
tags: [openapi, swagger, api-spec, rest, api-design, documentation]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(openapi:*, swagger:*)
---

# OpenAPI Expert

Expert guidance for OpenAPI Specification (formerly Swagger) - industry-standard for describing RESTful APIs with automatic documentation and code generation.

## Core Concepts

### OpenAPI Specification (OAS)

- API description format (YAML/JSON)
- Version 3.1 (latest) and 3.0
- Machine-readable API contracts
- Automatic documentation generation
- Client/server code generation
- API validation and testing

### Key Components

- Paths (endpoints)
- Operations (HTTP methods)
- Parameters
- Request/Response bodies
- Schemas (data models)
- Security schemes
- Components (reusable objects)

## Advanced Features

### Webhooks (OpenAPI 3.1)

```yaml
webhooks:
  postCreated:
    post:
      summary: Post created webhook
      operationId: onPostCreated
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Post'
      responses:
        '200':
          description: Webhook received
```

### Polymorphism (oneOf/anyOf/allOf)

```yaml
components:
  schemas:
    Pet:
      oneOf:
        - $ref: '#/components/schemas/Cat'
        - $ref: '#/components/schemas/Dog'
      discriminator:
        propertyName: petType
        mapping:
          cat: '#/components/schemas/Cat'
          dog: '#/components/schemas/Dog'

    Cat:
      allOf:
        - $ref: '#/components/schemas/PetBase'
        - type: object
          properties:
            petType:
              type: string
              enum: [cat]
            meow:
              type: string

    Dog:
      allOf:
        - $ref: '#/components/schemas/PetBase'
        - type: object
          properties:
            petType:
              type: string
              enum: [dog]
            bark:
              type: string
```

## Code Generation

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./client

# Generate Python Flask server
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python-flask \
  -o ./server

# Generate Java Spring server
openapi-generator-cli generate \
  -i openapi.yaml \
  -g spring \
  -o ./server
```

## Validation

```bash
# Install Spectral (OpenAPI linter)
npm install -g @stoplight/spectral-cli

# Validate spec
spectral lint openapi.yaml

# Custom ruleset
# .spectral.yaml
extends: spectral:oas
rules:
  operation-tags: error
  operation-operationId: error
  no-$ref-siblings: error
```

## Documentation Generation

```bash
# Swagger UI
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/openapi.yaml \
  -v $(pwd):/usr/share/nginx/html \
  swaggerapi/swagger-ui

# Redoc
docker run -p 8080:80 \
  -e SPEC_URL=openapi.yaml \
  -v $(pwd):/usr/share/nginx/html \
  redocly/redoc
```

## Best Practices

- Use semantic versioning
- Include examples in schemas
- Provide clear descriptions
- Use components for reusability
- Define proper error responses
- Include security schemes
- Add operation IDs
- Tag operations logically
- Validate specifications
- Version your APIs

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Basic OpenAPI Specification](references/BASIC_OPENAPI_SPECIFICATION.md)

## Resources

- OpenAPI Spec: https://spec.openapis.org/
- Swagger Editor: https://editor.swagger.io/
- OpenAPI Tools: https://openapi.tools/
- Stoplight Studio: https://stoplight.io/studio
