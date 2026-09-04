---
name: webrtc-expert
version: 1.1.0
description: >-
  Expert in WebRTC real-time communication, signaling protocols, ICE/STUN/TURN servers,
  peer connections, media streams, and building video/audio applications. Use when the user
  mentions real time, video, audio, peer to peer, signaling, or ice, or when the task
  involves WebRTC Architecture, Protocols & Standards, Basic Video Chat, or Screen Sharing.
category: tools
tags:
  [
    webrtc,
    real-time,
    video,
    audio,
    peer-to-peer,
    signaling,
    ice,
    stun,
    turn,
    media-streams,
    real-time-communication,
    video-chat,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: expert
---

# WebRTC Expert

## Core Concepts

### WebRTC Architecture

- **Peer Connection** - Direct P2P connection
- **Media Streams** - Audio/video tracks
- **Data Channels** - Arbitrary data transfer
- **Signaling** - Exchange connection info
- **ICE** - Interactive Connectivity Establishment
- **STUN/TURN** - NAT traversal servers

### Key Components

- **getUserMedia** - Access camera/microphone
- **RTCPeerConnection** - Peer-to-peer connection
- **RTCDataChannel** - Data communication
- **MediaRecorder** - Record media streams
- **Screen Sharing** - Capture screen content
- **Simulcast** - Multiple quality streams

### Protocols & Standards

- **SDP** - Session Description Protocol
- **Candidate Exchange** - ICE candidates
- **DTLS/SRTP** - Secure communication
- **Janus/Mediasoup** - Media servers
- **Socket.IO/WebSockets** - Signaling layer
- **ORTC** - Object RTC (alternative API)

## Best Practices

### Connection Establishment

- Always use STUN/TURN servers
- Implement proper signaling
- Handle connection failures
- Monitor connection quality
- Implement reconnection logic
- Test across different networks

### Media Handling

- Request appropriate constraints
- Handle permission denials
- Implement adaptive bitrate
- Monitor bandwidth usage
- Support screen sharing
- Handle device changes

### Security

- Use HTTPS for signaling
- Validate all signaling messages
- Implement authentication
- Encrypt data channels
- Use SRTP for media
- Sanitize user input

### Performance

- Use simulcast for groups
- Implement bandwidth adaptation
- Monitor CPU usage
- Optimize video resolution
- Use hardware acceleration
- Implement graceful degradation

## Anti-Patterns

### Common Mistakes

- No TURN server fallback
- Ignoring ICE failures
- Missing error handling
- Hard-coded ICE servers
- Not closing connections properly
- Missing permission checks

### Connection Issues

- Synchronous signaling
- No reconnection strategy
- Ignoring network changes
- Missing ICE restart
- Poor error messages
- No connection timeout

### Performance Problems

- Excessive video resolution
- No bandwidth adaptation
- Missing simulcast
- Inefficient signaling
- Not reusing connections
- Memory leaks from streams

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — Basic Video Chat (Vanilla JavaScript), Screen Sharing, Data Channel for Chat, Media Recording, React WebRTC Component

## Resources

### Official Documentation

- [WebRTC.org](https://webrtc.org/) - Official site
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) - API reference
- [WebRTC Samples](https://webrtc.github.io/samples/) - Code examples
- [Getting Started](https://webrtc.org/getting-started/overview) - Beginner guide

### Learning Resources

- [WebRTC for the Curious](https://webrtcforthecurious.com/) - Free book
- [WebRTC Codelab](https://codelabs.developers.google.com/codelabs/webrtc-web) - Tutorial
- [Real-Time Communication with WebRTC](https://www.html5rocks.com/en/tutorials/webrtc/basics/) - Guide
- [YouTube WebRTC](https://www.youtube.com/results?search_query=webrtc+tutorial) - Video tutorials

### Tools & Libraries

- [SimpleWebRTC](https://simplewebrtc.com/) - Simplified library
- [PeerJS](https://peerjs.com/) - P2P library
- [Daily.co](https://www.daily.co/) - Video API
- [Janus Gateway](https://janus.conf.meetecho.com/) - Media server

### Community Resources

- [WebRTC Discussion](https://groups.google.com/g/discuss-webrtc) - Google Group
- [Stack Overflow](https://stackoverflow.com/questions/tagged/webrtc) - Q&A
- [Reddit r/webrtc](https://www.reddit.com/r/webrtc/) - Community
- [WebRTC Weekly](https://webrtcweekly.com/) - Newsletter
