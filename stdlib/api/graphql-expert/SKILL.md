---
name: graphql-expert
version: 1.1.0
description: >-
  Expert-level GraphQL API development with schema design, resolvers, and subscriptions.
  Use when the user mentions API, apollo, schema, resolvers, subscriptions, or relay, or
  when the task involves Schema Design, Queries and Mutations, Apollo Server 4, or
  DataLoader for N+1 Prevention.
category: api
tags: [graphql, api, apollo, schema, resolvers, subscriptions, relay]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(node:*, npm:*, npx:*)
---

# GraphQL Expert

Expert guidance for GraphQL API development, schema design, resolvers, subscriptions, and best practices for building type-safe, efficient APIs.

## Core Concepts

### Schema Design

- Type system and schema definition language (SDL)
- Object types, interfaces, unions, and enums
- Input types and custom scalars
- Schema stitching and federation
- Modular schema organization

### Resolvers

- Resolver functions and data sources
- Context and info arguments
- Field-level resolvers
- Resolver chains and data loaders
- Error handling in resolvers

### Queries and Mutations

- Query design and naming conventions
- Mutation patterns and best practices
- Input validation and sanitization
- Pagination strategies (cursor-based, offset)
- Filtering and sorting

### Subscriptions

- Real-time updates with WebSocket
- Subscription resolvers
- PubSub patterns
- Subscription filtering
- Connection management

### Performance

- N+1 query problem and DataLoader
- Query complexity analysis
- Depth limiting and query cost
- Caching strategies (field-level, full response)
- Batching and deduplication

## GraphQL Federation

### Federated Schema

```typescript
// Users service
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.3")

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const resolvers = {
  User: {
    __resolveReference: async (reference, { dataSources }) => {
      return dataSources.userAPI.getUserById(reference.id);
    },
  },
  Query: {
    user: (_, { id }, { dataSources }) => dataSources.userAPI.getUserById(id),
    users: (_, __, { dataSources }) => dataSources.userAPI.getUsers(),
  },
};

// Posts service
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.3")

  type Post @key(fields: "id") {
    id: ID!
    title: String!
    content: String!
    author: User!
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    posts: [Post!]!
  }

  type Query {
    post(id: ID!): Post
    posts: [Post!]!
  }
`;

const resolvers = {
  Post: {
    author: (post) => ({ __typename: 'User', id: post.authorId }),
  },
  User: {
    posts: (user, _, { dataSources }) =>
      dataSources.postAPI.getPostsByAuthorId(user.id),
  },
};

// Gateway
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'users', url: 'http://localhost:4001/graphql' },
      { name: 'posts', url: 'http://localhost:4002/graphql' },
    ],
  }),
});

const server = new ApolloServer({ gateway });
```

## Anti-Patterns to Avoid

❌ **Exposing internal IDs**: Use opaque IDs or UUIDs
❌ **Overly nested queries**: Limit query depth
❌ **No pagination**: Always paginate lists
❌ **Resolving in mutations**: Keep mutations focused
❌ **Exposing database schema directly**: Design API-first
❌ **No DataLoader**: Leads to N+1 queries
❌ **Generic error messages**: Provide actionable errors
❌ **No versioning strategy**: Plan for schema evolution

## Testing

```typescript
import { ApolloServer } from '@apollo/server';
import { describe, it, expect } from 'vitest';

describe('GraphQL Server', () => {
  it('should fetch user by id', async () => {
    const server = new ApolloServer({ typeDefs, resolvers });

    const response = await server.executeOperation({
      query: `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
          }
        }
      `,
      variables: { id: '1' },
    });

    expect(response.body.kind).toBe('single');
    expect(response.body.singleResult.data?.user).toEqual({
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('should create post', async () => {
    const response = await server.executeOperation({
      query: `
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
            title
          }
        }
      `,
      variables: {
        input: {
          title: 'Test Post',
          content: 'Content',
        },
      },
    });

    expect(response.body.singleResult.data?.createPost).toHaveProperty('id');
  });
});
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Common Patterns](references/PATTERNS.md) — Relay Cursor Pagination, File Upload
- [Best Practices](references/BEST_PRACTICES.md) — Schema Design, Performance Optimization, Security
- [Modern GraphQL Development](references/MODERN_GRAPHQL_DEVELOPMENT.md) — Apollo Server 4, DataLoader for N+1 Prevention, GraphQL Codegen, Error Handling, Authentication & Authorization, Subscriptions with WebSocket, GraphQL Client (Apollo Client), Query Complexity & Depth Limiting

## Resources

- Apollo Server: https://www.apollographql.com/docs/apollo-server/
- GraphQL Spec: https://spec.graphql.org/
- DataLoader: https://github.com/graphql/dataloader
- GraphQL Code Generator: https://the-guild.dev/graphql/codegen
- GraphQL Tools: https://the-guild.dev/graphql/tools
