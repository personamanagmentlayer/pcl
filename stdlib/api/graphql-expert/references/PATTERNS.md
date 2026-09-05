# GraphQL Expert — Common Patterns

Reference material for the `graphql-expert` skill. See [SKILL.md](../SKILL.md).

## Common Patterns

### Relay Cursor Pagination

```graphql
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  cursor: String!
  node: Post!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### File Upload

```typescript
import { GraphQLUpload } from 'graphql-upload-ts';

const typeDefs = gql`
  scalar Upload

  type Mutation {
    uploadFile(file: Upload!): File!
  }
`;

const resolvers = {
  Upload: GraphQLUpload,

  Mutation: {
    uploadFile: async (_, { file }) => {
      const { createReadStream, filename, mimetype } = await file;
      const stream = createReadStream();

      // Process upload
      await saveFile(stream, filename);

      return { id: '1', filename, mimetype };
    },
  },
};
```
