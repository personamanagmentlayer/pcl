# GraphQL Expert — Best Practices

Reference material for the `graphql-expert` skill. See [SKILL.md](../SKILL.md).

## Best Practices

### Schema Design

```graphql
# Use clear, consistent naming
type User {
  id: ID!
  email: String!
  createdAt: DateTime!
}

# Prefer input types over many arguments
input CreateUserInput {
  email: String!
  name: String!
}

mutation {
  createUser(input: CreateUserInput!): User!
}

# Use enums for fixed sets
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
}

# Design for pagination
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}
```

### Performance Optimization

- Use DataLoader for batching and caching
- Implement query complexity analysis
- Add depth limiting
- Use persisted queries for production
- Cache at multiple levels (CDN, field-level, full response)
- Monitor query performance and slow fields

### Security

- Validate and sanitize all inputs
- Implement rate limiting
- Use query depth and complexity limits
- Sanitize error messages in production
- Implement proper authentication and authorization
- Use HTTPS for all connections
- Validate file uploads (type, size)
