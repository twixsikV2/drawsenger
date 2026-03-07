import React, { useState, useEffect } from 'react';
import { MuteIcon, CameraIcon, CameraOffIcon, EndCallIcon, UserIcon } from './Icons';
import '../styles/VideoCall.css';

interface VideoCallProps {
  contactName: string;
  onEndCall: () => void;
}

export function VideoCall({ contactName, onEndCall }: VideoCallProps) {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-call">
      <div className="video-container">
        <div className="video-main">
          <div className="avatar-large">
            <UserIcon size={80} />
          </div>
          <div className="contact-name">{contactName}</div>
          <div className="call-status">Идёт разговор</div>
        </div>
        <div className="video-mini">
          <UserIcon size={40} />
        </div>
      </div>

      <div className="call-timer-display">{formatTime(duration)}</div>

      <div className="call-controls">
        <button
          className={`control-btn ${isMuted ? 'muted' : ''}`}
          onClick={() => setIsMuted(!isMuted)}
          title="Микрофон"
        >
          <MuteIcon size={24} />
        </button>
        <button
          className={`control-btn ${!isVideoOn ? 'off' : ''}`}
          onClick={() => setIsVideoOn(!isVideoOn)}
          title="Камера"
        >
          {isVideoOn ? <CameraIcon size={24} /> : <CameraOffIcon size={24} />}
        </button>
        <button className="control-btn end-call" onClick={onEndCall} title="Завершить">
          <EndCallIcon size={24} />
        </button>
      </div>
    </div>
  );
}
