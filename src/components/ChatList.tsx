import React from 'react';
import { Chat, Message } from './ChatWindow';
import '../styles/ChatList.css';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
}

function getLastMessagePreview(messages: Message[]): string {
  if (messages.length === 0) return '';
  const last = messages[messages.length - 1];
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}с`;
    return `${mins}м ${secs}с`;
  };
  
  if (last.type === 'text') return last.text || '';
  if (last.type === 'sticker') return `${last.stickerId}`;
  if (last.type === 'photo') return '📷 Фото';
  if (last.type === 'voice') return `🎤 Голос (${last.voiceData?.duration || 0}s)`;
  if (last.type === 'call') return `☎️ Звонок (${formatDuration(last.callDuration || 0)})`;
  return '';
}

export function ChatList({ chats, selectedChatId, onSelectChat }: ChatListProps) {
  return (
    <div className="chat-list">
      {chats.map(chat => (
        <div
          key={chat.id}
          className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`}
          onClick={() => onSelectChat(chat.id)}
        >
          {chat.avatarUrl ? (
            <img src={chat.avatarUrl} alt={chat.name} className="chat-avatar-img" />
          ) : (
            <div className="chat-avatar">{chat.name[0]}</div>
          )}
          <div className="chat-info">
            <div className="chat-name">{chat.name}</div>
            <div className="chat-preview">{getLastMessagePreview(chat.messages)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
