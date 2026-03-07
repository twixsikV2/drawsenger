import React, { useState, useEffect } from 'react';
import { ChatList } from '../components/ChatList';
import { ChatWindow, Chat, Message } from '../components/ChatWindow';
import { SearchBar } from '../components/SearchBar';
import { SettingsPanel } from '../components/SettingsPanel';
import { VideoChat } from '../components/VideoChat';
import { UserSearch } from '../components/UserSearch';
import { SettingsIcon, LogoutIcon, UserIcon } from '../components/Icons';
import { sendPhoto, getUserChats, listenToMessages, sendMessage, sendSticker, sendVoiceMessage, deleteMessage, ensurePrivateChatExists } from '../lib/messages';
import { getUserUsername } from '../lib/auth';
import '../styles/MessengerPage.css';

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
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [pinnedMessages, setPinnedMessages] = useState<Map<string, string>>(new Map());
  const [replyingTo, setReplyingTo] = useState<{ chatId: string; messageId: string } | null>(null);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [userUsername, setUserUsername] = useState('You');
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  useEffect(() => {
    const loadUsername = async () => {
      try {
        const username = await getUserUsername(userId);
        setUserUsername(username);
      } catch (error) {
        console.error('Error loading username:', error);
      }
    };

    loadUsername();
  }, [userId]);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const firebaseChats = await getUserChats(userId);
        if (firebaseChats.length > 0) {
          const chatsWithMessages = await Promise.all(
            firebaseChats.map(async (chat) => {
              return new Promise<Chat>((resolve) => {
                const unsubscribe = listenToMessages(chat.id, async (messages) => {
                  let avatarUrl: string | undefined;
                  let chatName = chat.name;
                  
                  // Для приватных чатов загружаем аватар и имя другого пользователя
                  if (chat.type === 'private' && chat.members) {
                    const otherUserId = chat.members.find(id => id !== userId);
                    if (otherUserId) {
                      try {
                        const { getUserProfile } = await import('../lib/auth');
                        const profile = await getUserProfile(otherUserId);
                        avatarUrl = profile?.avatarUrl;
                        chatName = profile?.username || chat.name;
                      } catch (error) {
                        console.error('Error loading avatar:', error);
                      }
                    }
                  }
                  
                  resolve({
                    ...chat,
                    name: chatName,
                    avatarUrl,
                    messages: messages.map(msg => ({
                      ...msg,
                      timestamp: new Date(msg.timestamp)
                    }))
                  });
                });
              });
            })
          );
          setChats(chatsWithMessages);
          if (chatsWithMessages.length > 0) {
            setSelectedChatId(chatsWithMessages[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    };

    loadChats();
  }, [userId]);

  useEffect(() => {
    if (!selectedChatId) return;
    const unsubscribe = listenToMessages(selectedChatId, (messages) => {
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === selectedChatId
            ? {
                ...chat,
                messages: messages.map(msg => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                }))
              }
            : chat
        )
      );
    });
    return () => unsubscribe();
  }, [selectedChatId]);

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

  const handleSendMessage = async (text: string) => {
    if (!selectedChat) return;
    try {
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
        }
      }
      await sendMessage(selectedChatId, userId, userUsername, text);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendSticker = async (sticker: string) => {
    if (!selectedChat) return;
    try {
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
        }
      }
      await sendSticker(selectedChatId, userId, userUsername, sticker);
    } catch (error) {
      console.error('Error sending sticker:', error);
    }
  };

  const handleSendVoice = async (voiceData: { duration: number; audioBlob: Blob }) => {
    if (!selectedChat) return;
    try {
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
        }
      }
      await sendVoiceMessage(selectedChatId, userId, userUsername, voiceData.duration, voiceData.audioBlob);
    } catch (error) {
      console.error('Error sending voice:', error);
    }
  };

  const handleSendPhoto = async (file: File) => {
    if (!selectedChat) return;
    try {
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
        }
      }
      await sendPhoto(selectedChatId, userId, userUsername, file);
    } catch (error) {
      console.error('Error sending photo:', error);
    }
  };

  const handleCall = () => {
    setInCall(true);
    setCallDuration(0);
    setIsScreenShare(false);
  };

  const handleScreenShare = () => {
    setInCall(true);
    setCallDuration(0);
    setIsScreenShare(true);
  };

  const handleEndCall = () => {
    if (!selectedChat) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: userId,
      senderName: userUsername,
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

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(selectedChatId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
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

  const handleChatCreated = (chatId: string, chatName: string) => {
    const newChat: Chat = {
      id: chatId,
      name: chatName,
      type: 'private',
      messages: []
    };
    setChats([...chats, newChat]);
    setSelectedChatId(chatId);
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (inCall && selectedChat?.type === 'private') {
    return (
      <VideoChat
        contactName={selectedChat.name}
        onEndCall={handleEndCall}
        isScreenShare={isScreenShare}
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
            onClick={() => setShowUserSearch(true)}
            className="settings-btn"
            title="Найти пользователя"
          >
            <UserIcon size={20} />
          </button>
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
            onSendPhoto={handleSendPhoto}
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
          userId={userId}
        />
      )}
      {showUserSearch && (
        <UserSearch
          userId={userId}
          onChatCreated={handleChatCreated}
          onClose={() => setShowUserSearch(false)}
        />
      )}
    </div>
  );
}
