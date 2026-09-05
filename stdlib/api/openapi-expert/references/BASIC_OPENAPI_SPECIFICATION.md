# OpenAPI Expert — Basic OpenAPI Specification

Reference material for the `openapi-expert` skill. See [SKILL.md](../SKILL.md).

## Basic OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Blog API
  description: RESTful API for blog management
  version: 1.0.0
  contact:
    name: API Support
    email: support@example.com
  license:
    name: MIT

servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server

paths:
  /posts:
    get:
      summary: List all posts
      description: Returns a paginated list of blog posts
      operationId: listPosts
      tags:
        - Posts
      parameters:
        - name: page
          in: query
          description: Page number
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          description: Items per page
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, published]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Post'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalError'

    post:
      summary: Create a new post
      operationId: createPost
      tags:
        - Posts
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PostCreate'
      responses:
        '201':
          description: Post created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          $ref: '#/components/responses/ValidationError'

  /posts/{postId}:
    parameters:
      - name: postId
        in: path
        required: true
        description: Post ID
        schema:
          type: integer
          format: int64

    get:
      summary: Get a post
      operationId: getPost
      tags:
        - Posts
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      summary: Update a post
      operationId: updatePost
      tags:
        - Posts
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PostUpdate'
      responses:
        '200':
          description: Post updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Post'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      summary: Delete a post
      operationId: deletePost
      tags:
        - Posts
      security:
        - bearerAuth: []
      responses:
        '204':
          description: Post deleted
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    Post:
      type: object
      required:
        - id
        - title
        - content
        - author
        - status
        - createdAt
      properties:
        id:
          type: integer
          format: int64
          readOnly: true
        title:
          type: string
          minLength: 5
          maxLength: 200
        slug:
          type: string
          readOnly: true
        content:
          type: string
          minLength: 10
        author:
          $ref: '#/components/schemas/User'
        status:
          type: string
          enum: [draft, published]
          default: draft
        tags:
          type: array
          items:
            type: string
          maxItems: 10
        createdAt:
          type: string
          format: date-time
          readOnly: true
        updatedAt:
          type: string
          format: date-time
          readOnly: true

    PostCreate:
      type: object
      required:
        - title
        - content
      properties:
        title:
          type: string
          minLength: 5
          maxLength: 200
        content:
          type: string
          minLength: 10
        status:
          type: string
          enum: [draft, published]
          default: draft
        tags:
          type: array
          items:
            type: string

    PostUpdate:
      type: object
      properties:
        title:
          type: string
          minLength: 5
          maxLength: 200
        content:
          type: string
          minLength: 10
        status:
          type: string
          enum: [draft, published]
        tags:
          type: array
          items:
            type: string

    User:
      type: object
      properties:
        id:
          type: integer
          format: int64
        email:
          type: string
          format: email
        name:
          type: string

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

    Error:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
        message:
          type: string
        details:
          type: array
          items:
            type: object

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    ValidationError:
      description: Validation error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT authentication

    apiKey:
      type: apiKey
      in: header
      name: X-API-Key

security:
  - bearerAuth: []
```
