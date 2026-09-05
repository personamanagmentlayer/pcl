# Cloudflare Expert — Durable Objects

Reference material for the `cloudflare-expert` skill. See [SKILL.md](../SKILL.md).

## Durable Objects

```javascript
// Durable Object for stateful logic
export class Counter {
  constructor(state, env) {
    this.state = state;
    this.value = 0;
  }

  async initialize() {
    this.value = (await this.state.storage.get('value')) || 0;
  }

  async fetch(request) {
    await this.initialize();

    const url = new URL(request.url);

    if (url.pathname === '/increment') {
      this.value++;
      await this.state.storage.put('value', this.value);
      return new Response(String(this.value));
    }

    if (url.pathname === '/decrement') {
      this.value--;
      await this.state.storage.put('value', this.value);
      return new Response(String(this.value));
    }

    return new Response(String(this.value));
  }
}

// WebSocket chat room with Durable Objects
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    await this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(websocket) {
    websocket.accept();
    this.sessions.push(websocket);

    websocket.addEventListener('message', async (msg) => {
      // Broadcast to all sessions
      for (const session of this.sessions) {
        try {
          session.send(msg.data);
        } catch (err) {
          // Remove closed sessions
          this.sessions = this.sessions.filter((s) => s !== session);
        }
      }
    });
  }
}

// Worker that uses Durable Object
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const roomId = url.pathname.slice(1);

    // Get or create Durable Object
    const id = env.CHAT_ROOM.idFromName(roomId);
    const stub = env.CHAT_ROOM.get(id);

    return stub.fetch(request);
  },
};
```
