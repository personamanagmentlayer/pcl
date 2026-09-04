---
name: media-expert
version: 1.1.0
description: >-
  Expert-level media production, content management, streaming, broadcasting, and media
  technology systems. Use when the user mentions video, streaming, broadcast, CMS, or
  production, or when the task involves Media Production, Streaming and Broadcasting,
  Technologies, or Standards and Protocols.
category: domains
tags: [media, video, streaming, broadcast, cms, production]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Media Expert

Expert guidance for media production, content management systems, video streaming, broadcasting systems, and modern media technology solutions.

## Core Concepts

### Media Production

- Video production workflows
- Audio production and mixing
- Post-production and editing
- Visual effects (VFX)
- Color grading and correction
- Animation and motion graphics
- Live production

### Streaming and Broadcasting

- Video streaming platforms
- Content Delivery Networks (CDN)
- Adaptive bitrate streaming
- Live broadcasting
- OTT (Over-the-Top) platforms
- Digital rights management (DRM)
- Transcoding and encoding

### Technologies

- Media Asset Management (MAM)
- Digital Asset Management (DAM)
- Broadcast automation
- IP-based media production
- Cloud production workflows
- AI for content analysis
- Virtual production

### Standards and Protocols

- SMPTE standards
- HLS (HTTP Live Streaming)
- DASH (Dynamic Adaptive Streaming over HTTP)
- RTMP/RTSP protocols
- NDI (Network Device Interface)
- MXF (Material Exchange Format)
- Metadata standards (Dublin Core, IPTC)

## Video Streaming Platform

```python
class VideoStreamingPlatform:
    """Video streaming and delivery system"""

    def __init__(self):
        self.streams = {}
        self.viewers = {}
        self.cdn_nodes = {}

    def start_live_stream(self, stream_data: dict) -> dict:
        """Start live video stream"""
        stream_id = self._generate_stream_id()

        stream = {
            'stream_id': stream_id,
            'title': stream_data['title'],
            'description': stream_data.get('description', ''),
            'streamer_id': stream_data['streamer_id'],
            'status': 'live',
            'started_at': datetime.now(),
            'viewer_count': 0,
            'peak_viewers': 0,
            'ingest_url': f'rtmp://ingest.example.com/live/{stream_id}',
            'playback_urls': {
                'hls': f'https://cdn.example.com/live/{stream_id}/playlist.m3u8',
                'dash': f'https://cdn.example.com/live/{stream_id}/manifest.mpd'
            },
            'quality_profiles': ['1080p', '720p', '480p', '360p']
        }

        self.streams[stream_id] = stream

        return stream

    def generate_adaptive_bitrate_manifest(self, asset_id: str) -> dict:
        """Generate ABR manifest for adaptive streaming"""
        # Generate HLS manifest
        hls_variants = [
            {
                'bandwidth': 5000000,  # 5 Mbps
                'resolution': '1920x1080',
                'codecs': 'avc1.640028,mp4a.40.2',
                'url': f'1080p/playlist.m3u8'
            },
            {
                'bandwidth': 2800000,  # 2.8 Mbps
                'resolution': '1280x720',
                'codecs': 'avc1.64001f,mp4a.40.2',
                'url': f'720p/playlist.m3u8'
            },
            {
                'bandwidth': 1400000,  # 1.4 Mbps
                'resolution': '854x480',
                'codecs': 'avc1.64001e,mp4a.40.2',
                'url': f'480p/playlist.m3u8'
            },
            {
                'bandwidth': 800000,  # 800 Kbps
                'resolution': '640x360',
                'codecs': 'avc1.64001e,mp4a.40.2',
                'url': f'360p/playlist.m3u8'
            }
        ]

        return {
            'asset_id': asset_id,
            'protocol': 'hls',
            'master_playlist_url': f'https://cdn.example.com/vod/{asset_id}/master.m3u8',
            'variants': hls_variants
        }

    def track_viewer_metrics(self, stream_id: str, viewer_id: str) -> dict:
        """Track viewer engagement metrics"""
        metrics = {
            'stream_id': stream_id,
            'viewer_id': viewer_id,
            'watch_time_seconds': 3600,
            'buffer_events': 2,
            'average_bitrate': 3500000,
            'quality_switches': 5,
            'playback_start_time_ms': 1200,
            'errors': 0,
            'device_type': 'desktop',
            'browser': 'chrome'
        }

        # Calculate Quality of Experience (QoE)
        qoe_score = self._calculate_qoe(metrics)
        metrics['qoe_score'] = qoe_score

        return metrics

    def _calculate_qoe(self, metrics: dict) -> float:
        """Calculate Quality of Experience score"""
        score = 100.0

        # Penalize buffering
        score -= metrics['buffer_events'] * 5

        # Penalize startup time
        if metrics['playback_start_time_ms'] > 2000:
            score -= 10

        # Penalize errors
        score -= metrics['errors'] * 15

        return max(0.0, score)

    def implement_drm(self, asset_id: str, drm_config: dict) -> dict:
        """Implement Digital Rights Management"""
        drm = {
            'asset_id': asset_id,
            'drm_systems': {
                'widevine': {
                    'license_url': 'https://license.example.com/widevine',
                    'supported_levels': ['L1', 'L3']
                },
                'fairplay': {
                    'certificate_url': 'https://license.example.com/fairplay/cert',
                    'license_url': 'https://license.example.com/fairplay/license'
                },
                'playready': {
                    'license_url': 'https://license.example.com/playready'
                }
            },
            'encryption': 'AES-128-CTR',
            'key_rotation_interval': 3600  # seconds
        }

        return drm

    def optimize_cdn_delivery(self, asset_id: str, viewer_location: tuple) -> dict:
        """Optimize CDN delivery based on viewer location"""
        # Find nearest CDN edge node
        nearest_node = self._find_nearest_cdn_node(viewer_location)

        return {
            'asset_id': asset_id,
            'cdn_node': nearest_node['node_id'],
            'cdn_location': nearest_node['location'],
            'distance_km': nearest_node['distance'],
            'estimated_latency_ms': nearest_node['latency'],
            'delivery_url': f"https://{nearest_node['node_id']}.cdn.example.com/{asset_id}"
        }

    def _find_nearest_cdn_node(self, viewer_location: tuple) -> dict:
        """Find nearest CDN edge node to viewer"""
        # Would calculate actual distances to CDN nodes
        return {
            'node_id': 'edge-us-east-1',
            'location': 'Virginia, USA',
            'distance': 250,  # km
            'latency': 15  # ms
        }

    def _generate_stream_id(self) -> str:
        import uuid
        return f"STREAM-{uuid.uuid4().hex[:8].upper()}"
```

## Broadcast Automation

```python
class BroadcastAutomationSystem:
    """Broadcast scheduling and automation"""

    def __init__(self):
        self.schedule = []
        self.playlists = {}

    def create_broadcast_schedule(self, channel: str, date: datetime, programming: List[dict]) -> dict:
        """Create daily broadcast schedule"""
        schedule_items = []
        current_time = date.replace(hour=0, minute=0, second=0)

        for program in programming:
            item = {
                'channel': channel,
                'start_time': current_time,
                'end_time': current_time + timedelta(seconds=program['duration']),
                'program_title': program['title'],
                'asset_id': program['asset_id'],
                'type': program['type'],  # 'program', 'commercial', 'filler'
                'metadata': program.get('metadata', {})
            }

            schedule_items.append(item)
            current_time = item['end_time']

        self.schedule.extend(schedule_items)

        return {
            'channel': channel,
            'date': date.date().isoformat(),
            'total_items': len(schedule_items),
            'total_duration': (schedule_items[-1]['end_time'] - schedule_items[0]['start_time']).seconds,
            'schedule': schedule_items[:5]  # Return first 5 items
        }

    def generate_playlist(self, schedule_id: str) -> dict:
        """Generate playout playlist"""
        # Convert schedule to playout format
        playlist = {
            'playlist_id': self._generate_playlist_id(),
            'format': 'xml',  # or 'json'
            'items': []
        }

        return playlist

    def monitor_broadcast(self, channel: str) -> dict:
        """Monitor live broadcast status"""
        status = {
            'channel': channel,
            'on_air': True,
            'current_program': 'Evening News',
            'time_code': '00:15:32',
            'next_program': 'Sports Tonight',
            'next_program_in': 2728,  # seconds
            'signal_quality': {
                'video_ok': True,
                'audio_ok': True,
                'sync_ok': True
            },
            'alarms': []
        }

        return status

    def _generate_playlist_id(self) -> str:
        import uuid
        return f"PLAY-{uuid.uuid4().hex[:8].upper()}"
```

## Best Practices

### Media Production

- Use standardized workflows
- Implement version control
- Maintain proper backups
- Use collaborative tools
- Implement quality control
- Document production processes
- Use industry-standard formats

### Content Management

- Implement robust metadata schema
- Use consistent naming conventions
- Enable full-text search
- Implement access controls
- Maintain audit trails
- Use automated workflows
- Implement archival policies

### Streaming Delivery

- Use adaptive bitrate streaming
- Implement CDN for global delivery
- Monitor QoE metrics
- Optimize for mobile devices
- Implement DRM when required
- Use low-latency protocols for live
- Monitor buffer ratios

### Broadcasting

- Implement redundant systems
- Automate scheduling
- Monitor signal quality
- Maintain emergency protocols
- Use backup playout systems
- Implement proper logging
- Conduct regular testing

## Anti-Patterns

❌ No backup systems
❌ Poor metadata management
❌ Single bitrate streaming
❌ No CDN implementation
❌ Ignoring QoE metrics
❌ Manual scheduling processes
❌ No DRM for premium content
❌ Poor asset organization
❌ No disaster recovery plan

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Content Management System](references/CONTENT_MANAGEMENT_SYSTEM.md)

## Resources

- SMPTE: https://www.smpte.org/
- Streaming Media: https://www.streamingmedia.com/
- NAB (National Association of Broadcasters): https://www.nab.org/
- EBU (European Broadcasting Union): https://www.ebu.ch/
- FFmpeg: https://ffmpeg.org/
- Video.js: https://videojs.com/
- OTT Standards: https://www.ott-standards.org/
