import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';

function playJoinSound() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = 520;
  gain.gain.value = 0.3;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.stop(ctx.currentTime + 0.6);
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { localStream, remoteStream, status, isMuted, isCameraOff, error, toggleMute, toggleCamera, endCall } =
    useWebRTC(roomId);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const prevStatus = useRef(status);

  // Request notification permission when entering the room
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // Notify when someone joins
  useEffect(() => {
    if (prevStatus.current === 'waiting' && status === 'connecting') {
      playJoinSound();
      if (Notification.permission === 'granted') {
        new Notification('Someone joined your call', { body: 'Connecting now…' });
      }
    }
    prevStatus.current = status;
  }, [status]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnd = () => {
    endCall();
    navigate('/');
  };

  if (status === 'error') {
    return (
      <div className="centered">
        <p className="error-msg">{error}</p>
        <button className="btn primary-btn" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="centered">
        <h2 className="ended-title">Call ended</h2>
        <button className="btn primary-btn" onClick={() => navigate('/')}>
          Start New Call
        </button>
      </div>
    );
  }

  return (
    <div className="room">
      {/* Background: remote video */}
      <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />

      {/* Setup / Waiting overlay */}
      {(status === 'setup' || status === 'waiting') && (
        <div className="overlay">
          <div className="card">
            {status === 'setup' ? (
              <p>Starting camera&hellip;</p>
            ) : (
              <>
                <p>Waiting for someone to join&hellip;</p>
                <button className="btn copy-btn" onClick={copyLink}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Connecting indicator */}
      {status === 'connecting' && (
        <div className="status-pill">Connecting&hellip;</div>
      )}

      {/* Local video (picture-in-picture) */}
      <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />

      {/* Controls */}
      <div className="controls">
        <button className={`btn ctrl-btn ${isMuted ? 'off' : ''}`} onClick={toggleMute}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button className="btn ctrl-btn end-btn" onClick={handleEnd}>
          End
        </button>
        <button className={`btn ctrl-btn ${isCameraOff ? 'off' : ''}`} onClick={toggleCamera}>
          {isCameraOff ? 'Cam On' : 'Cam Off'}
        </button>
      </div>
    </div>
  );
}
