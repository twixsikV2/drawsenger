import React, { useState, useEffect } from 'react';
import { ChatList } from '../components/ChatList';
import { ChatWindow } from '../components/ChatWindow';
import { SearchBar } from '../components/SearchBar';
import { SettingsPanel } from '../components/SettingsPanel';
import { VideoCall } from '../components/VideoCall';
import { SettingsIcon, LogoutIcon } from '../components/Icons';
import '../styles/MessengerPage.css';

interface Message {
  id: string;
  sender: string;
  text?: string;
  timestamp: Date;
  type: 'text' | 'sticker' | 'voice' | 'call';
  stickerId?: string;
  voiceData?: { duration: number; url: string };
  callDuration?: number;
}

interface Chat {
  id: string;
  name: string;
  type: 'private' | 'group' | 'channel';
  messages: Message[];
}

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
type FontSize = 'small' | 'medium' | 'large';

interface MessengerPageProps {
  userId: string;
  onLogout: () => void;
  theme: Theme;
  fontSize: FontSize;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (size: FontSize) => void;
}

export function MessengerPage({
  userId,
  onLogout,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
}: MessengerPageProps) {
  const [chats, setChats] = useState<Chat[]>([
    { id: '1', name: 'Общий чат', type: 'group', messages: [] },
    { id: '2', name: 'Личный чат', type: 'private', messages: [] },
  ]);
  const [selectedChatId, setSelectedChatId] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [pinnedMessages, setPinnedMessages] = useState<Map<string, string>>(new Map());
  const [replyingTo, setReplyingTo] = useState<{ chatId: string; messageId: string } | null>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  useEffect(() => {
    if (!inCall) return;
    const interval = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [inCall]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(400, startWidth + diff));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSendMessage = (text: string) => {
    if (!selectedChat) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: userId,
      text,
      timestamp: new Date(),
      type: 'text'
    };
    setChats(chats.map(chat =>
      chat.id === selectedChatId
        ? { ...chat, messages: [...chat.messages, newMessage] }
        : chat
    ));
    setReplyingTo(null);
  };

  const handleSendSticker = (sticker: string) => {
    if (!selectedChat) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: userId,
      timestamp: new Date(),
      type: 'sticker',
      stickerId: sticker
    };
    setChats(chats.map(chat =>
      chat.id === selectedChatId
        ? { ...chat, messages: [...chat.messages, newMessage] }
        : chat
    ));
  };

  const handleSendVoice = (voiceData: { duration: number; url: string }) => {
    if (!selectedChat) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: userId,
      timestamp: new Date(),
      type: 'voice',
      voiceData
    };
    setChats(chats.map(chat =>
      chat.id === selectedChatId
        ? { ...chat, messages: [...chat.messages, newMessage] }
        : chat
    ));
  };

  const handleCall = () => {
    setInCall(true);
    setCallDuration(0);
  };

  const handleEndCall = () => {
    if (!selectedChat) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: userId,
      text: 'Звонок',
      timestamp: new Date(),
      type: 'call',
      callDuration
    };
    setChats(chats.map(chat =>
      chat.id === selectedChatId
        ? { ...chat, messages: [...chat.messages, newMessage] }
        : chat
    ));
    setInCall(false);
  };

  const handleDeleteMessage = (messageId: string, deleteForAll: boolean) => {
    setChats(chats.map(chat =>
      chat.id === selectedChatId
        ? {
            ...chat,
            messages: chat.messages.filter(m => m.id !== messageId)
          }
        : chat
    ));
  };

  const handlePinMessage = (messageId: string) => {
    console.log('Pin message called with:', messageId);
    const newPinned = new Map(pinnedMessages);
    if (newPinned.has(selectedChatId)) {
      newPinned.delete(selectedChatId);
    } else {
      newPinned.set(selectedChatId, messageId);
    }
    setPinnedMessages(newPinned);
    console.log('Pinned messages:', newPinned);
  };

  const handleReplyMessage = (messageId: string) => {
    console.log('Reply message called with:', messageId);
    setReplyingTo({ chatId: selectedChatId, messageId });
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (inCall && selectedChat?.type === 'private') {
    return (
      <VideoCall
        contactName={selectedChat.name}
        onEndCall={handleEndCall}
      />
    );
  }

  return (
    <div className="messenger-container">
      <div className="sidebar" ref={sidebarRef} style={{ width: `${sidebarWidth}px` }}>
        <div className="sidebar-resizer" onMouseDown={handleMouseDown} />
        <div className="sidebar-header">
          <img src="/icon.png" alt="DrawSenger" className="sidebar-icon" />
          <h2>DrawSenger</h2>
          <button
            onClick={() => setShowSettings(true)}
            className="settings-btn"
            title="Настройки"
          >
            <SettingsIcon size={20} />
          </button>
          <button onClick={onLogout} className="logout-btn">
            <LogoutIcon size={20} />
          </button>
        </div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <ChatList
          chats={filteredChats}
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
        />
      </div>
      <div className="main-content">
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            userId={userId}
            onSendMessage={handleSendMessage}
            onSendSticker={handleSendSticker}
            onSendVoice={handleSendVoice}
            onDeleteMessage={handleDeleteMessage}
            onPinMessage={handlePinMessage}
            onReplyMessage={handleReplyMessage}
            pinnedMessageId={pinnedMessages.get(selectedChatId)}
            replyingTo={replyingTo?.chatId === selectedChatId ? replyingTo : null}
            onCancelReply={() => setReplyingTo(null)}
            onCall={handleCall}
            onRecall={handleCall}
          />
        ) : (
          <div className="no-chat">Выберите чат</div>
        )}
      </div>
      {showSettings && (
        <SettingsPanel
          theme={theme}
          fontSize={fontSize}
          onThemeChange={onThemeChange}
          onFontSizeChange={onFontSizeChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
