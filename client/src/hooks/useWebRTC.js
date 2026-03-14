import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(roomId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  // setup | waiting | connecting | connected | ended | error
  const [status, setStatus] = useState('setup');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState(null);

  // Use a single ref object to avoid stale closures in event handlers
  const r = useRef({ socket: null, pc: null, localStream: null, candidateQueue: [] });

  useEffect(() => {
    const state = r.current;

    function createPC(stream) {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      state.pc = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remote = new MediaStream();
      pc.ontrack = ({ streams }) => {
        streams[0].getTracks().forEach((t) => remote.addTrack(t));
        setRemoteStream(remote);
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          state.socket?.emit('ice-candidate', { roomId, candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setStatus('connected');
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) setStatus('ended');
      };

      return pc;
    }

    async function drainCandidates() {
      while (state.candidateQueue.length) {
        const c = state.candidateQueue.shift();
        await state.pc?.addIceCandidate(new RTCIceCandidate(c));
      }
    }

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        state.localStream = stream;
        setLocalStream(stream);

        // Connect to the signaling server (same origin; Vite proxies /socket.io in dev)
        const socket = io();
        state.socket = socket;

        socket.on('joined', ({ isInitiator }) => {
          setStatus(isInitiator ? 'waiting' : 'connecting');
          // Second peer creates their PC now and waits for the offer
          if (!isInitiator) createPC(stream);
        });

        // First peer receives this when the second peer joins → creates and sends offer
        socket.on('peer-joined', async () => {
          setStatus('connecting');
          const pc = createPC(stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId, offer });
        });

        socket.on('offer', async (offer) => {
          await state.pc.setRemoteDescription(new RTCSessionDescription(offer));
          await drainCandidates();
          const answer = await state.pc.createAnswer();
          await state.pc.setLocalDescription(answer);
          socket.emit('answer', { roomId, answer });
        });

        socket.on('answer', async (answer) => {
          await state.pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainCandidates();
        });

        socket.on('ice-candidate', (candidate) => {
          if (state.pc?.remoteDescription) {
            state.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            state.candidateQueue.push(candidate);
          }
        });

        socket.on('peer-left', () => setStatus('ended'));

        socket.on('room-full', () => {
          setError('This room already has two people in it.');
          setStatus('error');
        });

        socket.emit('join-room', roomId);
      } catch (err) {
        const msg =
          err.name === 'NotAllowedError'
            ? 'Camera or microphone access was denied. Please allow access and try again.'
            : err.message;
        setError(msg);
        setStatus('error');
      }
    }

    init();

    return () => {
      state.localStream?.getTracks().forEach((t) => t.stop());
      state.pc?.close();
      state.socket?.disconnect();
    };
  }, [roomId]);

  const toggleMute = useCallback(() => {
    const track = r.current.localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = r.current.localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    }
  }, []);

  const endCall = useCallback(() => {
    r.current.localStream?.getTracks().forEach((t) => t.stop());
    r.current.pc?.close();
    r.current.socket?.disconnect();
    setStatus('ended');
  }, []);

  return { localStream, remoteStream, status, isMuted, isCameraOff, error, toggleMute, toggleCamera, endCall };
}
