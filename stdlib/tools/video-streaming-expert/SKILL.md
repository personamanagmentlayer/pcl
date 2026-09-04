---
name: video-streaming-expert
version: 1.1.0
description: >-
  Expert in video streaming technologies, HLS, DASH, adaptive bitrate streaming, CDN
  delivery, DRM protection, and video encoding/transcoding. Use when the user mentions
  video, streaming, media, WebRTC, multimedia, or HLS, or when the task involves Streaming
  Protocols, Adaptive Bitrate Streaming, FFmpeg Video Transcoding, or Node.js Streaming
  Server.
category: tools
tags:
  [
    video,
    streaming,
    media,
    webrtc,
    multimedia,
    video-streaming,
    hls,
    dash,
    adaptive-bitrate,
    cdn,
    drm,
    ffmpeg,
    video-encoding,
    live-streaming,
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

# Video Streaming Expert

## Core Concepts

### Streaming Protocols

- **HLS** - HTTP Live Streaming (Apple)
- **DASH** - Dynamic Adaptive Streaming over HTTP
- **RTMP** - Real-Time Messaging Protocol (legacy)
- **WebRTC** - Real-time peer-to-peer
- **SRT** - Secure Reliable Transport
- **RTSP** - Real-Time Streaming Protocol

### Adaptive Bitrate Streaming

- **Multi-Bitrate** - Multiple quality levels
- **Manifest Files** - Playlist/MPD files
- **Segments** - Small video chunks (2-10 seconds)
- **Quality Switching** - Dynamic adaptation
- **Buffer Management** - Smooth playback
- **Bandwidth Detection** - Network monitoring

### Key Components

- **Encoder** - Video compression (H.264, H.265, VP9, AV1)
- **Transcoder** - Format conversion
- **Packager** - Create streaming formats
- **CDN** - Content delivery network
- **Player** - Video playback (HLS.js, Dash.js, Video.js)
- **DRM** - Digital rights management

## Best Practices

### Encoding

- Use modern codecs (H.265, VP9, AV1)
- Implement adaptive bitrate ladder
- Optimize keyframe intervals
- Use constant quality mode (CRF)
- Test across devices
- Monitor encoding costs

### Delivery

- Use CDN for distribution
- Implement proper caching
- Enable CORS headers
- Support range requests
- Optimize segment size
- Monitor bandwidth costs

### Player

- Implement quality switching
- Handle network errors
- Support offline playback
- Optimize buffer management
- Provide accessibility features
- Track analytics

### Security

- Implement DRM when needed
- Use signed URLs
- Enable HTTPS
- Validate tokens
- Rate limit requests
- Monitor for piracy

## Anti-Patterns

### Common Mistakes

- Single bitrate streaming
- Large segment sizes
- Missing error recovery
- No buffer management
- Hard-coded CDN URLs
- Ignoring mobile constraints

### Performance Issues

- Excessive buffering
- Poor quality ladder
- Missing CDN
- Inefficient encoding
- No cache headers
- Synchronous transcoding

### Security Problems

- Unprotected content
- Missing token validation
- Weak DRM implementation
- Exposed API keys
- No rate limiting
- Missing CORS configuration

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Implementation Examples](references/EXAMPLES.md) — FFmpeg Video Transcoding, Node.js Streaming Server, HLS Player (React), DASH Streaming Configuration, DRM Integration (Widevine)

## Resources

### Official Documentation

- [HLS Specification](https://datatracker.ietf.org/doc/html/rfc8216) - Apple HLS
- [DASH Industry Forum](https://dashif.org/) - DASH standard
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html) - Video processing
- [Shaka Player](https://shaka-player-demo.appspot.com/) - DRM player

### Learning Resources

- [Video Encoding Basics](https://developer.apple.com/documentation/http_live_streaming) - Apple guide
- [Adaptive Streaming](https://bitmovin.com/adaptive-streaming/) - Comprehensive guide
- [Video Compression](https://www.encoding.com/video-compression-guide/) - Best practices
- [YouTube Engineering](https://www.youtube.com/@YouTubeEngineering) - Talks

### Tools & Services

- [FFmpeg](https://ffmpeg.org/) - Video processing
- [Cloudflare Stream](https://www.cloudflare.com/products/cloudflare-stream/) - Streaming service
- [AWS MediaConvert](https://aws.amazon.com/mediaconvert/) - Cloud transcoding
- [Mux](https://mux.com/) - Video infrastructure

### Community Resources

- [Video Dev Slack](https://video-dev.org/) - Community
- [r/VideoEditing](https://www.reddit.com/r/VideoEditing/) - Reddit
- [Stack Overflow](https://stackoverflow.com/questions/tagged/video-streaming) - Q&A
- [Streaming Media](https://www.streamingmedia.com/) - Industry news
