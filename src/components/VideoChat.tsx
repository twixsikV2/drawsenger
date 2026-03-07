import React, { useState, useRef, useEffect } from 'react';
import { EndCallIcon, CameraOffIcon } from './Icons';
import '../styles/VideoChat.css';

interface VideoChatProps {
  contactName: string;
  onEndCall: () => void;
  isScreenShare?: boolean;
}

export function VideoChat({ contactName, onEndCall, isScreenShare }: VideoChatProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        if (isScreenShare) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true,
            audio: false 
          });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (error) {
        console.error('Error accessing media:', error);
      }
    };

    startVideo();

    return () => {
      if (localVideoRef.current?.srcObject) {
        const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isScreenShare]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const tracks = (localVideoRef.current.srcObject as MediaStream).getAudioTracks();
      tracks.forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const tracks = (localVideoRef.current.srcObject as MediaStream).getVideoTracks();
      tracks.forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="video-chat-container">
      <div className="video-main">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-remote"
        />
        <div className="video-info">
          <h2>{contactName}</h2>
          <div className="call-duration">{formatDuration(callDuration)}</div>
        </div>
      </div>

      <div className="video-local-container">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="video-local"
        />
        {isScreenShare && <div className="screen-share-badge">Демонстрация экрана</div>}
      </div>

      <div className="video-controls">
        <button
          className={`control-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Включить микрофон' : 'Отключить микрофон'}
        >
          🎤
        </button>
        <button
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          onClick={toggleVideo}
          title={isVideoOff ? 'Включить камеру' : 'Отключить камеру'}
        >
          <CameraOffIcon size={20} />
        </button>
        <button
          className="control-btn end-call"
          onClick={onEndCall}
          title="Завершить звонок"
        >
          <EndCallIcon size={20} />
        </button>
      </div>
    </div>
  );
}
