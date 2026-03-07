import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon } from './Icons';
import '../styles/VoiceMessage.css';

interface VoiceMessageProps {
  duration: number;
  url: string;
}

export function VoiceMessage({ duration, url }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Генерируем волны для визуализации
    const waves = Array.from({ length: 30 }, () => Math.random() * 0.8 + 0.2);
    setWaveform(waves);
  }, []);

  const updateWaveform = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const newWaveform = Array.from(dataArray)
      .slice(0, 30)
      .map(value => value / 255);

    setWaveform(newWaveform);
    animationRef.current = requestAnimationFrame(updateWaveform);
  };

  const handlePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      } else {
        try {
          // Создаём AudioContext для анализа при воспроизведении
          if (!audioContextRef.current) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaElementSource(audioRef.current!);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
          }

          await audioRef.current.play();
          setIsPlaying(true);
          updateWaveform();
        } catch (error) {
          console.error('Ошибка воспроизведения:', error);
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const progress = (currentTime / duration) * 100;

  return (
    <div className="voice-message">
      <button className="play-btn" onClick={handlePlay}>
        {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
      </button>
      <div className="voice-waveform">
        {waveform.map((height, i) => (
          <div
            key={i}
            className={`wave ${isPlaying ? 'playing' : ''}`}
            style={{
              height: `${Math.max(height * 100, 20)}%`,
              opacity: progress > (i / waveform.length) * 100 ? 1 : 0.4
            }}
          />
        ))}
      </div>
      <span className="voice-time">{Math.floor(currentTime)}s</span>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
    </div>
  );
}
