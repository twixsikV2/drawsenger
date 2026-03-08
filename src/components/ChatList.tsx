import React, { useState } from 'react';
import { Chat, Message } from '../lib/messages';
import { DeleteIcon, StarIcon, StarFilledIcon, BlockIcon, HeartIcon } from './Icons';
import '../styles/ChatList.css';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string;
  userId: string;
  onSelectChat: (chatId: string) => void;
  onDeleteChat?: (chatId: string, deleteForAll: boolean) => void;
  onPinChat?: (chatId: string, isPinned: boolean) => void;
  onBlockUser?: (userId: string) => void;
  onManageGroup?: (chatId: string) => void;
  onCreateGroup?: () => void;
  pinnedChats?: string[];
  blockedUsers?: string[];
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

export function ChatList({ chats, selectedChatId, userId, onSelectChat, onDeleteChat, onPinChat, onBlockUser, onManageGroup, onCreateGroup, pinnedChats = [], blockedUsers = [] }: ChatListProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: string | 'background' } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    const menuWidth = 180;
    const menuHeight = 120;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = Math.max(10, x - menuWidth);
    }
    if (y + menuHeight > window.innerHeight) {
      y = Math.max(10, y - menuHeight);
    }

    setContextMenu({ x, y, chatId });
  };

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.chat-context-menu')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    // Проверяем, что клик был именно на фоне, а не на элементе
    if ((e.target as HTMLElement).className === 'chat-list') {
      e.preventDefault();
      const menuWidth = 180;
      const menuHeight = 60;
      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth > window.innerWidth) {
        x = Math.max(10, x - menuWidth);
      }
      if (y + menuHeight > window.innerHeight) {
        y = Math.max(10, y - menuHeight);
      }

      setContextMenu({ x, y, chatId: 'background' });
    }
  };

  return (
    <div className="chat-list" onContextMenu={handleBackgroundContextMenu}>
      {chats.map(chat => (
        <div
          key={chat.id}
          className={`chat-item ${selectedChatId === chat.id ? 'active' : ''} ${pinnedChats.includes(chat.id) ? 'pinned' : ''}`}
          onClick={() => onSelectChat(chat.id)}
          onContextMenu={(e) => handleContextMenu(e, chat.id)}
        >
          {chat.id === 'favorites' ? (
            <div className="chat-avatar chat-avatar-favorites">
              <HeartIcon size={24} color="white" />
            </div>
          ) : chat.type === 'favorites' ? (
            <div className="chat-avatar chat-avatar-favorites">
              <HeartIcon size={24} color="white" />
            </div>
          ) : chat.avatarUrl ? (
            <img src={chat.avatarUrl} alt={chat.name} className="chat-avatar-img" />
          ) : (
            <div className="chat-avatar">{chat.name[0]}</div>
          )}
          <div className="chat-info">
            <div className="chat-name">{chat.name}</div>
            <div className="chat-preview">{getLastMessagePreview(chat.messages)}</div>
          </div>
          {pinnedChats.includes(chat.id) && (
            <div className="chat-pinned-icon">
              <StarFilledIcon size={14} color="var(--primary)" />
            </div>
          )}
        </div>
      ))}
      
      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={() => setContextMenu(null)}
        >
          {contextMenu.chatId === 'background' ? (
            <button
              className="chat-menu-item"
              onClick={() => {
                onCreateGroup?.();
                setContextMenu(null);
              }}
            >
              <span>Создать группу</span>
            </button>
          ) : (
            <>
              <button
                className="chat-menu-item"
                onClick={() => {
                  onPinChat?.(contextMenu.chatId, !pinnedChats.includes(contextMenu.chatId));
                  setContextMenu(null);
                }}
              >
                {pinnedChats.includes(contextMenu.chatId) ? (
                  <>
                    <StarFilledIcon size={16} color="var(--primary)" />
                    <span>Открепить</span>
                  </>
                ) : (
                  <>
                    <StarIcon size={16} />
                    <span>Закрепить</span>
                  </>
                )}
              </button>
              {contextMenu.chatId !== 'favorites' && (
                <>
                  <button
                    className="chat-menu-item delete-own"
                    onClick={() => {
                      onDeleteChat?.(contextMenu.chatId, false);
                      setContextMenu(null);
                    }}
                  >
                    <DeleteIcon size={16} />
                    <span>Удалить у меня</span>
                  </button>
                  <button
                    className="chat-menu-item delete-all"
                    onClick={() => {
                      onDeleteChat?.(contextMenu.chatId, true);
                      setContextMenu(null);
                    }}
                  >
                    <DeleteIcon size={16} />
                    <span>Удалить для всех</span>
                  </button>
                </>
              )}
              {onBlockUser && chats.find(c => c.id === contextMenu.chatId)?.type === 'private' && (
                <button
                  className="chat-menu-item block-user"
                  onClick={() => {
                    const chat = chats.find(c => c.id === contextMenu.chatId);
                    if (chat?.members) {
                      const otherUserId = chat.members.find(id => id !== userId);
                      if (otherUserId) {
                        onBlockUser(otherUserId);
                        setContextMenu(null);
                      }
                    }
                  }}
                >
                  <BlockIcon size={16} />
                  <span>{blockedUsers.includes(chats.find(c => c.id === contextMenu.chatId)?.members?.find(id => id !== userId) || '') ? 'Разблокировать' : 'Заблокировать'}</span>
                </button>
              )}
              {onManageGroup && chats.find(c => c.id === contextMenu.chatId)?.type === 'group' && (
                <button
                  className="chat-menu-item"
                  onClick={() => {
                    onManageGroup(contextMenu.chatId);
                    setContextMenu(null);
                  }}
                >
                  <span>Управление группой</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
