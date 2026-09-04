# GraphQL Expert — Modern GraphQL Development

Reference material for the `graphql-expert` skill. See [SKILL.md](../SKILL.md).

## Modern GraphQL Development

### Apollo Server 4

```typescript
// Apollo Server 4 setup
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

// Type definitions
const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String!
    posts: [Post!]!
    createdAt: DateTime!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    published: Boolean!
    tags: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Query {
    users(limit: Int = 10, offset: Int = 0): UsersConnection!
    user(id: ID!): User
    posts(filter: PostFilter, sort: SortOrder): [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    publishPost(id: ID!): Post!
  }

  type Subscription {
    postPublished: Post!
    userCreated: User!
  }

  input CreateUserInput {
    email: String!
    name: String!
    password: String!
  }

  input UpdateUserInput {
    email: String
    name: String
  }

  input CreatePostInput {
    title: String!
    content: String!
    tags: [String!]
  }

  input UpdatePostInput {
    title: String
    content: String
    tags: [String!]
  }

  input PostFilter {
    published: Boolean
    authorId: ID
    tag: String
  }

  type UsersConnection {
    nodes: [User!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  enum SortOrder {
    NEWEST_FIRST
    OLDEST_FIRST
    TITLE_ASC
    TITLE_DESC
  }

  scalar DateTime
`;

// Resolvers
const resolvers = {
  Query: {
    users: async (_, { limit, offset }, { dataSources }) => {
      const users = await dataSources.userAPI.getUsers({ limit, offset });
      const totalCount = await dataSources.userAPI.getTotalCount();

      return {
        nodes: users,
        totalCount,
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
        },
      };
    },

    user: async (_, { id }, { dataSources }) => {
      return dataSources.userAPI.getUserById(id);
    },

    posts: async (_, { filter, sort }, { dataSources }) => {
      return dataSources.postAPI.getPosts({ filter, sort });
    },

    post: async (_, { id }, { dataSources }) => {
      return dataSources.postAPI.getPostById(id);
    },
  },

  Mutation: {
    createUser: async (_, { input }, { dataSources, user }) => {
      // Validate input
      if (!isValidEmail(input.email)) {
        throw new GraphQLError('Invalid email address', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return dataSources.userAPI.createUser(input);
    },

    updateUser: async (_, { id, input }, { dataSources, user }) => {
      // Check authorization
      if (user.id !== id && !user.isAdmin) {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return dataSources.userAPI.updateUser(id, input);
    },

    createPost: async (_, { input }, { dataSources, user, pubsub }) => {
      if (!user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const post = await dataSources.postAPI.createPost({
        ...input,
        authorId: user.id,
      });

      return post;
    },

    publishPost: async (_, { id }, { dataSources, user, pubsub }) => {
      const post = await dataSources.postAPI.publishPost(id);

      // Trigger subscription
      pubsub.publish('POST_PUBLISHED', { postPublished: post });

      return post;
    },
  },

  Subscription: {
    postPublished: {
      subscribe: (_, __, { pubsub }) =>
        pubsub.asyncIterator(['POST_PUBLISHED']),
    },

    userCreated: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(['USER_CREATED']),
    },
  },

  User: {
    posts: async (parent, _, { dataSources }) => {
      return dataSources.postAPI.getPostsByAuthorId(parent.id);
    },
  },

  Post: {
    author: async (parent, _, { dataSources }) => {
      return dataSources.userAPI.getUserById(parent.authorId);
    },
  },

  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO 8601 date-time string',
    serialize(value: Date) {
      return value.toISOString();
    },
    parseValue(value: string) {
      return new Date(value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value);
      }
      return null;
    },
  }),
};

// Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization || '';
    const user = await getUserFromToken(token);

    return {
      user,
      dataSources: {
        userAPI: new UserAPI(),
        postAPI: new PostAPI(),
      },
      pubsub,
    };
  },
  listen: { port: 4000 },
});
```

### DataLoader for N+1 Prevention

```typescript
import DataLoader from 'dataloader';

// Create DataLoaders
class UserAPI {
  private loader: DataLoader<string, User>;

  constructor() {
    this.loader = new DataLoader(async (ids: readonly string[]) => {
      // Batch fetch users
      const users = await db.user.findMany({
        where: { id: { in: [...ids] } },
      });

      // Return in same order as input ids
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) ?? null);
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.loader.load(id);
  }

  async getUsersByIds(ids: string[]): Promise<(User | null)[]> {
    return this.loader.loadMany(ids);
  }
}

// Usage in resolvers
const resolvers = {
  Post: {
    author: async (parent, _, { dataSources }) => {
      // This will be batched with DataLoader
      return dataSources.userAPI.getUserById(parent.authorId);
    },
  },
};
```

### GraphQL Codegen

```yaml
# codegen.yml
schema: './src/schema.graphql'
documents: './src/**/*.graphql'
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-resolvers
      - typescript-operations
    config:
      useIndexSignature: true
      contextType: '../context#Context'
      mappers:
        User: '../models#UserModel'
        Post: '../models#PostModel'
```

```typescript
// Generated types usage
import { Resolvers } from './generated/graphql';

const resolvers: Resolvers = {
  Query: {
    user: async (_, { id }, { dataSources }) => {
      return dataSources.userAPI.getUserById(id);
    },
  },
};
```

### Error Handling

```typescript
import { GraphQLError } from 'graphql';

class NotFoundError extends GraphQLError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        resource,
        id,
      },
    });
  }
}

class ValidationError extends GraphQLError {
  constructor(message: string, field: string) {
    super(message, {
      extensions: {
        code: 'BAD_USER_INPUT',
        field,
      },
    });
  }
}

// Usage
const resolvers = {
  Query: {
    user: async (_, { id }, { dataSources }) => {
      const user = await dataSources.userAPI.getUserById(id);
      if (!user) {
        throw new NotFoundError('User', id);
      }
      return user;
    },
  },
};
```

### Authentication & Authorization

```typescript
// Context with user
interface Context {
  user: User | null;
  dataSources: DataSources;
}

// Auth directive
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLSchema } from 'graphql';

function authDirective(directiveName: string) {
  return {
    authDirectiveTypeDefs: `directive @${directiveName}(requires: Role = USER) on OBJECT | FIELD_DEFINITION`,

    authDirectiveTransformer: (schema: GraphQLSchema) =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const directive = getDirective(
            schema,
            fieldConfig,
            directiveName
          )?.[0];

          if (directive) {
            const { resolve = defaultFieldResolver } = fieldConfig;
            const { requires } = directive;

            fieldConfig.resolve = async (source, args, context, info) => {
              if (!context.user) {
                throw new GraphQLError('Not authenticated', {
                  extensions: { code: 'UNAUTHENTICATED' },
                });
              }

              if (requires && !context.user.roles.includes(requires)) {
                throw new GraphQLError('Not authorized', {
                  extensions: { code: 'FORBIDDEN' },
                });
              }

              return resolve(source, args, context, info);
            };
          }

          return fieldConfig;
        },
      }),
  };
}

// Schema with directive
const typeDefs = `#graphql
  enum Role {
    USER
    ADMIN
  }

  type Query {
    user(id: ID!): User @auth
    adminData: AdminData @auth(requires: ADMIN)
  }
`;
```

### Subscriptions with WebSocket

```typescript
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Setup subscription server
useServer(
  {
    schema,
    context: async (ctx) => {
      const token = ctx.connectionParams?.authentication;
      const user = await getUserFromToken(token);
      return { user, pubsub };
    },
  },
  wsServer
);

// Subscription resolvers
const resolvers = {
  Subscription: {
    postPublished: {
      subscribe: (_, __, { pubsub }) =>
        pubsub.asyncIterator(['POST_PUBLISHED']),
    },

    messageAdded: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator(['MESSAGE_ADDED']),
        (payload, variables) => {
          // Filter by channel
          return payload.messageAdded.channelId === variables.channelId;
        }
      ),
    },
  },
};
```

### GraphQL Client (Apollo Client)

```typescript
import { ApolloClient, InMemoryCache, gql, useQuery, useMutation } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
});

// Query
const GET_USERS = gql`
  query GetUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      nodes {
        id
        name
        email
      }
      totalCount
      pageInfo {
        hasNextPage
      }
    }
  }
`;

function UserList() {
  const { loading, error, data } = useQuery(GET_USERS, {
    variables: { limit: 10, offset: 0 },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data.users.nodes.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// Mutation
const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      author {
        name
      }
    }
  }
`;

function CreatePostForm() {
  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    refetchQueries: ['GetPosts'],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createPost({
      variables: {
        input: {
          title: 'New Post',
          content: 'Post content',
        },
      },
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// Subscription
const POST_PUBLISHED = gql`
  subscription OnPostPublished {
    postPublished {
      id
      title
      author {
        name
      }
    }
  }
`;

function PostFeed() {
  const { data, loading } = useSubscription(POST_PUBLISHED);

  if (loading) return <p>Waiting for posts...</p>;

  return <div>New post: {data.postPublished.title}</div>;
}
```

### Query Complexity & Depth Limiting

```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityLimitRule(1000, {
      scalarCost: 1,
      objectCost: 10,
      listFactor: 10,
    }),
  ],
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation({ request, document }) {
            const complexity = getComplexity({
              schema,
              query: document,
              variables: request.variables,
              estimators: [
                fieldExtensionsEstimator(),
                simpleEstimator({ defaultComplexity: 1 }),
              ],
            });

            if (complexity > 1000) {
              throw new GraphQLError(
                `Query is too complex: ${complexity}. Maximum allowed: 1000`
              );
            }
          },
        };
      },
    },
  ],
});
```
