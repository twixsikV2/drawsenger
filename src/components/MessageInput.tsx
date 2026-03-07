import React, { useState, useRef } from 'react';
import { StickerPicker } from './StickerPicker';
import { MicrophoneIcon, SendIcon } from './Icons';
import '../styles/MessageInput.css';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onSendSticker: (sticker: string) => void;
  onSendVoice: (voiceData: { duration: number; url: string }) => void;
}

export function MessageInput({ onSendMessage, onSendSticker, onSendVoice }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const isCancelledRef = useRef(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

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

  const handleStartRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Создаём AudioContext для анализа
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        if (!isCancelledRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const url = URL.createObjectURL(audioBlob);
          onSendVoice({
            duration: recordingTime,
            url
          });
        }
        stream.getTracks().forEach(track => track.stop());
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        isCancelledRef.current = false;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setWaveform([]);
      updateWaveform();
    } catch (error) {
      alert('Нужно разрешить доступ к микрофону');
    }
  };

  const handleStopRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  React.useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  if (isRecording) {
    return (
      <div className="voice-recording">
        <div className="recording-info">
          <div className="recording-indicator">🔴 Запись...</div>
          <div className="recording-waveform">
            {waveform.map((height, i) => (
              <div
                key={i}
                className="recording-wave"
                style={{
                  height: `${Math.max(height * 100, 10)}%`
                }}
              />
            ))}
          </div>
          <div className="recording-time">{recordingTime}s</div>
        </div>
        <button className="record-stop-btn" onClick={handleStopRecord}>
          Отправить
        </button>
        <button
          className="record-cancel-btn"
          onClick={() => {
            isCancelledRef.current = true;
            setIsRecording(false);
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
            }
          }}
        >
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div className="message-input-container">
      <form className="message-input" onSubmit={handleSubmit}>
        <button
          type="button"
          className="action-btn"
          onClick={() => setShowStickers(!showStickers)}
          title="Стикеры"
        >
          😊
        </button>
        <input
          type="text"
          value={message}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
          placeholder="Сообщение..."
          className="input-field"
        />
        <button
          type="button"
          className="action-btn"
          onClick={handleStartRecord}
          title="Голос"
        >
          <MicrophoneIcon size={20} />
        </button>
        <button type="submit" className="send-btn">
          <SendIcon size={20} />
        </button>
      </form>
      {showStickers && (
        <StickerPicker
          onSelectSticker={(sticker: string) => {
            onSendSticker(sticker);
            setShowStickers(false);
          }}
          onClose={() => setShowStickers(false)}
        />
      )}
    </div>
  );
}
