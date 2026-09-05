# WebRTC Expert — Implementation Examples

Reference material for the `webrtc-expert` skill. See [SKILL.md](../SKILL.md).

## Implementation Examples

### Basic Video Chat (Vanilla JavaScript)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>WebRTC Video Chat</title>
    <style>
      video {
        width: 45%;
        margin: 10px;
      }
      .controls {
        margin: 20px;
      }
    </style>
  </head>
  <body>
    <div class="controls">
      <button id="startBtn">Start Call</button>
      <button id="hangupBtn">Hang Up</button>
    </div>

    <video id="localVideo" autoplay muted playsinline></video>
    <video id="remoteVideo" autoplay playsinline></video>

    <script src="/socket.io/socket.io.js"></script>
    <script src="app.js"></script>
  </body>
</html>
```

```javascript
// app.js - Client side
const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const hangupBtn = document.getElementById('hangupBtn');

let localStream;
let remoteStream;
let peerConnection;

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:turnserver.example.com:3478',
      username: 'username',
      credential: 'password',
    },
  ],
};

startBtn.addEventListener('click', startCall);
hangupBtn.addEventListener('click', hangUp);

async function startCall() {
  try {
    // Get local media stream
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    localVideo.srcObject = localStream;

    // Create peer connection
    peerConnection = new RTCPeerConnection(configuration);

    // Add local tracks
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteVideo.srcObject = remoteStream;
      }
      remoteStream.addTrack(event.track);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
    };

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  } catch (error) {
    console.error('Error starting call:', error);
  }
}

// Handle incoming offer
socket.on('offer', async (offer) => {
  if (!peerConnection) {
    await startCall();
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit('answer', answer);
});

// Handle incoming answer
socket.on('answer', async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Handle incoming ICE candidates
socket.on('ice-candidate', async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
});

function hangUp() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  socket.emit('hang-up');
}

socket.on('hang-up', hangUp);
```

```javascript
// server.js - Signaling server (Node.js)
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    rooms.get(roomId).add(socket.id);

    // Notify others in room
    socket.to(roomId).emit('user-joined', socket.id);

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.broadcast.emit('ice-candidate', candidate);
  });

  socket.on('hang-up', () => {
    socket.broadcast.emit('hang-up');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove from all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit('user-left', socket.id);

        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Screen Sharing

```javascript
async function startScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
      },
      audio: false,
    });

    // Replace video track
    const videoTrack = screenStream.getVideoTracks()[0];
    const sender = peerConnection
      .getSenders()
      .find((s) => s.track && s.track.kind === 'video');

    if (sender) {
      sender.replaceTrack(videoTrack);
    }

    // Handle screen share stop
    videoTrack.onended = () => {
      stopScreenShare();
    };

    localVideo.srcObject = screenStream;
  } catch (error) {
    console.error('Error sharing screen:', error);
  }
}

async function stopScreenShare() {
  // Revert to camera
  const cameraStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  const videoTrack = cameraStream.getVideoTracks()[0];
  const sender = peerConnection
    .getSenders()
    .find((s) => s.track && s.track.kind === 'video');

  if (sender) {
    sender.replaceTrack(videoTrack);
  }

  localVideo.srcObject = cameraStream;
}
```

### Data Channel for Chat

```javascript
let dataChannel;

// Create data channel (caller side)
function createDataChannel() {
  dataChannel = peerConnection.createDataChannel('chat', {
    ordered: true,
  });

  setupDataChannelHandlers(dataChannel);
}

// Handle data channel (receiver side)
peerConnection.ondatachannel = (event) => {
  dataChannel = event.channel;
  setupDataChannelHandlers(dataChannel);
};

function setupDataChannelHandlers(channel) {
  channel.onopen = () => {
    console.log('Data channel opened');
    document.getElementById('sendBtn').disabled = false;
  };

  channel.onclose = () => {
    console.log('Data channel closed');
    document.getElementById('sendBtn').disabled = true;
  };

  channel.onmessage = (event) => {
    displayMessage(event.data, 'remote');
  };

  channel.onerror = (error) => {
    console.error('Data channel error:', error);
  };
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();

  if (message && dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(message);
    displayMessage(message, 'local');
    input.value = '';
  }
}

function displayMessage(text, type) {
  const messagesDiv = document.getElementById('messages');
  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
```

### Media Recording

```javascript
let mediaRecorder;
let recordedChunks = [];

function startRecording(stream) {
  recordedChunks = [];

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm; codecs=vp9',
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, {
      type: 'video/webm',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recording.webm';
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
  };

  mediaRecorder.start();
  console.log('Recording started');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('Recording stopped');
  }
}
```

### React WebRTC Component

```jsx
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

function VideoChat() {
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('offer', handleOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);
    socketRef.current.on('hang-up', hangUp);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      hangUp();
    };
  }, []);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;

      const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      stream.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      peerConnectionRef.current.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', event.candidate);
        }
      };

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socketRef.current.emit('offer', offer);

      setIsCallStarted(true);
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const handleOffer = async (offer) => {
    // Implementation similar to vanilla JS version
  };

  const handleAnswer = async (answer) => {
    await peerConnectionRef.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleIceCandidate = async (candidate) => {
    await peerConnectionRef.current.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const hangUp = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setIsCallStarted(false);
    socketRef.current.emit('hang-up');
  };

  return (
    <div className="video-chat">
      <div className="videos">
        <video ref={localVideoRef} autoPlay muted playsInline />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>

      <div className="controls">
        {!isCallStarted ? (
          <button onClick={startCall}>Start Call</button>
        ) : (
          <>
            <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
            <button onClick={toggleVideo}>
              {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
            </button>
            <button onClick={hangUp}>Hang Up</button>
          </>
        )}
      </div>
    </div>
  );
}

export default VideoChat;
```
