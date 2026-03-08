import React, { useState, useEffect } from 'react';
import { ChatList } from '../components/ChatList';
import { ChatWindow } from '../components/ChatWindow';
import { SearchBar } from '../components/SearchBar';
import { SettingsPanel } from '../components/SettingsPanel';
import { VideoChat } from '../components/VideoChat';
import { UserSearch } from '../components/UserSearch';
import { SettingsIcon, LogoutIcon, UserIcon } from '../components/Icons';
import { sendPhoto, getUserChats, listenToMessages, sendMessage, sendSticker, sendVoiceMessage, deleteMessage, ensurePrivateChatExists, listenToUserChats, deleteUserChat, deleteChat, togglePinChat, getPinnedChats, Chat, Message, initializeFavoritesChat } from '../lib/messages';
import { getUserUsername } from '../lib/auth';
import { ref, get, set } from 'firebase/database';
import { database } from '../lib/firebase';
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
  const [chats, setChats] = useState<Chat[]>([]);
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
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
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
    
    // Инициализируем чат "Избранное"
    const initFavorites = async () => {
      try {
        await initializeFavoritesChat(userId);
      } catch (error) {
        console.error('Error initializing favorites:', error);
      }
    };
    
    initFavorites();
    
    // Загружаем закрепленные чаты
    const loadPinnedChats = async () => {
      try {
        const pinned = await getPinnedChats(userId);
        setPinnedChats(pinned);
      } catch (error) {
        console.error('Error loading pinned chats:', error);
      }
    };
    
    loadPinnedChats();

    // Загружаем заблокированных пользователей
    const loadBlockedUsers = async () => {
      try {
        const { getBlockedUsers } = await import('../lib/auth');
        const blocked = await getBlockedUsers(userId);
        setBlockedUsers(blocked.map((b: any) => typeof b === 'string' ? b : b.id));
      } catch (error) {
        console.error('Error loading blocked users:', error);
      }
    };

    loadBlockedUsers();

    // Запускаем еженедельную очистку больших старых сообщений
    const { scheduleWeeklyCleanup } = require('../lib/imgbb');
    const { remove } = require('firebase/database');
    scheduleWeeklyCleanup(database, ref, remove);
  }, [userId]);

  useEffect(() => {
    const unsubscribe = listenToUserChats(userId, async (firebaseChats) => {
      try {
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
                
                // Загружаем pinnedMessageId
                try {
                  const pinnedSnapshot = await get(ref(database, `chats/${chat.id}/pinnedMessageId`));
                  const pinnedId = pinnedSnapshot.val();
                  if (pinnedId) {
                    const newPinned = new Map(pinnedMessages);
                    newPinned.set(chat.id, pinnedId);
                    setPinnedMessages(newPinned);
                  }
                } catch (error) {
                  console.error('Error loading pinned message:', error);
                }
                
                resolve({
                  ...chat,
                  name: chatName,
                  avatarUrl,
                  messages: messages
                });
              });
            });
          })
        );
        
        // Сортируем чаты: "Избранное" в начале, потом остальные
        const favoritesChat = chatsWithMessages.find(c => c.type === 'favorites');
        const otherChats = chatsWithMessages.filter(c => c.type !== 'favorites');
        
        // Если "Избранное" найдено, используем его, иначе создаём с аватаром
        let favorites = favoritesChat;
        if (!favorites) {
          favorites = {
            id: 'favorites',
            name: 'Избранное',
            type: 'favorites',
            messages: [],
            createdAt: Date.now(),
            members: [],
            avatarUrl: undefined
          };
        }
        
        const sortedChats = [favorites, ...otherChats];
        
        setChats(sortedChats);
        if (sortedChats.length > 0 && !selectedChatId) {
          setSelectedChatId(sortedChats[0].id);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    });

    return () => unsubscribe();
  }, [userId, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) return;
    const unsubscribe = listenToMessages(selectedChatId, (messages) => {
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === selectedChatId
            ? {
                ...chat,
                messages: messages
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
      let chatId = selectedChatId;
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          chatId = await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
          if (chatId !== selectedChatId) {
            setSelectedChatId(chatId);
          }
        }
      }
      
      // Получаем информацию о reply если есть
      let replyInfo = undefined;
      if (replyingTo) {
        const repliedMessage = selectedChat.messages.find(m => m.id === replyingTo.messageId);
        if (repliedMessage) {
          replyInfo = {
            messageId: replyingTo.messageId,
            senderName: repliedMessage.senderName,
            text: repliedMessage.type === 'text' ? (repliedMessage.text || '') : `[${repliedMessage.type}]`
          };
        }
      }
      
      await sendMessage(chatId, userId, userUsername, text, replyInfo);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendSticker = async (sticker: string) => {
    if (!selectedChat) return;
    try {
      let chatId = selectedChatId;
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          chatId = await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
          if (chatId !== selectedChatId) {
            setSelectedChatId(chatId);
          }
        }
      }
      await sendSticker(chatId, userId, userUsername, sticker);
    } catch (error) {
      console.error('Error sending sticker:', error);
    }
  };

  const handleSendVoice = async (voiceData: { duration: number; audioBlob: Blob }) => {
    if (!selectedChat) return;
    try {
      let chatId = selectedChatId;
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          chatId = await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
          if (chatId !== selectedChatId) {
            setSelectedChatId(chatId);
          }
        }
      }
      await sendVoiceMessage(chatId, userId, userUsername, voiceData.duration, voiceData.audioBlob);
    } catch (error) {
      console.error('Error sending voice:', error);
    }
  };

  const handleSendPhoto = async (file: File) => {
    if (!selectedChat) return;
    try {
      let chatId = selectedChatId;
      // Для приватных чатов убеждаемся, что чат существует у обоих пользователей
      if (selectedChat.type === 'private' && selectedChat.members) {
        const otherUserId = selectedChat.members.find(id => id !== userId);
        if (otherUserId) {
          chatId = await ensurePrivateChatExists(userId, otherUserId, selectedChat.name, userUsername);
          if (chatId !== selectedChatId) {
            setSelectedChatId(chatId);
          }
        }
      }
      await sendPhoto(chatId, userId, userUsername, file);
    } catch (error: any) {
      console.error('Error sending photo:', error);
      alert(`Ошибка загрузки фото: ${error.message}`);
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
      timestamp: Date.now(),
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

  const handlePinMessage = async (messageId: string) => {
    if (!selectedChatId) return;
    
    try {
      const newPinned = new Map(pinnedMessages);
      
      if (newPinned.has(selectedChatId)) {
        newPinned.delete(selectedChatId);
        await set(ref(database, `chats/${selectedChatId}/pinnedMessageId`), null);
      } else {
        newPinned.set(selectedChatId, messageId);
        await set(ref(database, `chats/${selectedChatId}/pinnedMessageId`), messageId);
      }
      
      setPinnedMessages(newPinned);
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const handleBlockUser = async (blockedUserId: string) => {
    try {
      const { blockUser, unblockUser, isUserBlocked } = await import('../lib/auth');
      const isBlocked = await isUserBlocked(userId, blockedUserId);
      
      if (isBlocked) {
        await unblockUser(userId, blockedUserId);
        setBlockedUsers(blockedUsers.filter(id => id !== blockedUserId));
        alert('Пользователь разблокирован');
      } else {
        await blockUser(userId, blockedUserId);
        setBlockedUsers([...blockedUsers, blockedUserId]);
        alert('Пользователь заблокирован');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Ошибка');
    }
  };

  const handleCreateGroup = async () => {
    const groupName = prompt('Введи имя группы:');
    if (!groupName) return;
    
    try {
      const { createGroup } = require('../lib/messages');
      const group = await createGroup(groupName, userId, [userId]);
      setChats([...chats, group]);
      setSelectedChatId(group.id);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Ошибка создания группы');
    }
  };

  const handleManageGroup = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.type !== 'group') return;

    const action = prompt('Выбери действие:\n1 - Пригласить пользователя\n2 - Выйти из группы\n3 - Удалить группу\n4 - Изменить имя');
    
    if (action === '1') {
      const userId = prompt('Введи ID пользователя для приглашения:');
      if (!userId) return;
      try {
        const { inviteUserToGroup } = require('../lib/messages');
        inviteUserToGroup(chatId, userId).then(() => {
          alert('Пользователь приглашен');
        });
      } catch (error) {
        console.error('Error inviting user:', error);
        alert('Ошибка приглашения');
      }
    } else if (action === '2') {
      try {
        const { removeUserFromGroup } = require('../lib/messages');
        removeUserFromGroup(chatId, userId).then(() => {
          setChats(chats.filter(c => c.id !== chatId));
          if (selectedChatId === chatId) {
            setSelectedChatId(chats.length > 1 ? chats[0].id : '');
          }
          alert('Вы вышли из группы');
        });
      } catch (error) {
        console.error('Error leaving group:', error);
        alert('Ошибка выхода');
      }
    } else if (action === '3') {
      if (confirm('Удалить группу для всех?')) {
        try {
          const { deleteGroup } = require('../lib/messages');
          deleteGroup(chatId).then(() => {
            setChats(chats.filter(c => c.id !== chatId));
            if (selectedChatId === chatId) {
              setSelectedChatId(chats.length > 1 ? chats[0].id : '');
            }
            alert('Группа удалена');
          });
        } catch (error) {
          console.error('Error deleting group:', error);
          alert('Ошибка удаления');
        }
      }
    } else if (action === '4') {
      const newName = prompt('Введи новое имя группы:');
      if (!newName) return;
      try {
        const { updateGroupName } = require('../lib/messages');
        updateGroupName(chatId, newName).then(() => {
          setChats(chats.map(c => c.id === chatId ? { ...c, name: newName } : c));
          alert('Имя группы изменено');
        });
      } catch (error) {
        console.error('Error updating group name:', error);
        alert('Ошибка изменения имени');
      }
    }
  };

  const handleReplyMessage = (messageId: string) => {
    console.log('Reply message called with:', messageId);
    setReplyingTo({ chatId: selectedChatId, messageId });
  };

  const handleDeleteChat = async (chatId: string, deleteForAll: boolean) => {
    try {
      if (deleteForAll) {
        await deleteChat(chatId);
      } else {
        await deleteUserChat(userId, chatId);
      }
      setChats(chats.filter(c => c.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(chats.length > 1 ? chats[0].id : '');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handlePinChat = async (chatId: string, isPinned: boolean) => {
    try {
      await togglePinChat(userId, chatId, isPinned);
      if (isPinned) {
        setPinnedChats([...pinnedChats, chatId]);
      } else {
        setPinnedChats(pinnedChats.filter(id => id !== chatId));
      }
    } catch (error) {
      console.error('Error pinning chat:', error);
    }
  };

  const handleChatCreated = (chatId: string, chatName: string) => {
    const newChat: Chat = {
      id: chatId,
      name: chatName,
      type: 'private',
      messages: [],
      createdAt: Date.now(),
      members: []
    };
    setChats([...chats, newChat]);
    setSelectedChatId(chatId);
    // На мобильных скрываем сайдбар при выборе чата
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    // На мобильных скрываем сайдбар при выборе чата
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Закрепленные чаты в начале
    const aPinned = pinnedChats.includes(a.id) ? 0 : 1;
    const bPinned = pinnedChats.includes(b.id) ? 0 : 1;
    return aPinned - bPinned;
  });

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
      <div className="sidebar" ref={sidebarRef} style={{ width: `${sidebarWidth}px`, display: showSidebar ? 'flex' : 'none' }}>
        <div className="sidebar-resizer" onMouseDown={handleMouseDown} />
        <div className="sidebar-header">
          <img src={require('../assets/icon.png')} alt="DrawSenger" className="sidebar-icon" />
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
          userId={userId}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onPinChat={handlePinChat}
          onBlockUser={handleBlockUser}
          onManageGroup={handleManageGroup}
          onCreateGroup={handleCreateGroup}
          pinnedChats={pinnedChats}
          blockedUsers={blockedUsers}
        />
      </div>
      <div className="main-content" style={{ display: !showSidebar ? 'flex' : 'none' }}>
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
            onBackToChats={() => setShowSidebar(true)}
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
