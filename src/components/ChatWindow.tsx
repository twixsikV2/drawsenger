import React, { useState } from 'react';
import { MessageInput } from './MessageInput';
import { VoiceMessage } from './VoiceMessage';
import { PhoneIcon, DeleteIcon, CheckSquareIcon, StarIcon, ReplyIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon, StarFilledIcon, PhotoIcon, ZoomInIcon, ZoomOutIcon, DownloadIcon } from './Icons';
import '../styles/ChatWindow.css';

export interface Message {
  id: string;
  sender: string;
  senderName: string;
  text?: string;
  photoUrl?: string;
  timestamp: Date;
  type: 'text' | 'sticker' | 'voice' | 'call' | 'photo';
  stickerId?: string;
  voiceData?: { duration: number; url: string };
  callDuration?: number;
}

export interface Chat {
  id: string;
  name: string;
  type: 'private' | 'group' | 'channel';
  messages: Message[];
  avatarUrl?: string;
  members?: string[];
}

interface ChatWindowProps {
  chat: Chat;
  userId: string;
  onSendMessage: (text: string) => void;
  onSendSticker: (sticker: string) => void;
  onSendVoice: (voiceData: { duration: number; audioBlob: Blob }) => void;
  onSendPhoto?: (file: File) => void;
  onDeleteMessage: (messageId: string, deleteForAll?: boolean) => void;
  onPinMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  pinnedMessageId?: string;
  replyingTo?: { messageId: string; text?: string } | null;
  onCancelReply?: () => void;
  onCall: () => void;
  onRecall?: () => void;
}

export function ChatWindow({
  chat,
  userId,
  onSendMessage,
  onSendSticker,
  onSendVoice,
  onSendPhoto,
  onDeleteMessage,
  onPinMessage,
  onReplyMessage,
  pinnedMessageId,
  replyingTo,
  onCancelReply,
  onCall,
  onRecall,
}: ChatWindowProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [deleteMode, setDeleteMode] = useState<'me' | 'all' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showPinned, setShowPinned] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ url: string; scale: number; offsetX?: number; offsetY?: number } | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const isUserScrolling = React.useRef(false);
  const hideButtonTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isAtBottom && showScrollButton) {
      setShowScrollButton(false);
    } else if (!isAtBottom && !showScrollButton) {
      setShowScrollButton(true);
    }
  };

  React.useEffect(() => {
    if (!isUserScrolling.current) {
      scrollToBottom();
    }
  }, [chat.messages]);

  React.useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [showScrollButton]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}с`;
    return `${mins}м ${secs}с`;
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    const menuWidth = 200;
    const menuHeight = 180;
    let x = e.clientX;
    let y = e.clientY;

    // Проверяем границы экрана по X
    if (x + menuWidth > window.innerWidth) {
      x = Math.max(10, x - menuWidth);
    }
    // Проверяем границы экрана по Y
    if (y + menuHeight > window.innerHeight) {
      y = Math.max(10, y - menuHeight);
    }

    setContextMenu({ x, y, messageId });
  };

  const handlePhotoMouseDown = (e: React.MouseEvent) => {
    if (!photoModal || photoModal.scale <= 1) return;
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsetX = photoModal.offsetX || 0;
    const startOffsetY = photoModal.offsetY || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      setPhotoModal(prev => prev ? {
        ...prev,
        offsetX: startOffsetX + deltaX,
        offsetY: startOffsetY + deltaY
      } : null);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDeleteClick = (messageId: string, deleteForAll: boolean) => {
    onDeleteMessage(messageId, deleteForAll);
    setContextMenu(null);
  };

  const toggleMessageSelection = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const deleteSelectedMessages = () => {
    selectedMessages.forEach(messageId => {
      onDeleteMessage(messageId, deleteMode === 'all');
    });
    setSelectedMessages(new Set());
    setSelectionMode(false);
    setDeleteMode(null);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
    setDeleteMode(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }
    const results = chat.messages
      .filter(msg => 
        msg.type === 'text' && 
        msg.text?.toLowerCase().includes(query.toLowerCase())
      )
      .map(msg => msg.id);
    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    const messageId = searchResults[nextIndex];
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);
    const messageId = searchResults[prevIndex];
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="chat-window">
      <div className="chat-header">
        {selectionMode ? (
          <>
            <div className="selection-info">
              Выбрано: {selectedMessages.size}
            </div>
            {deleteMode ? (
              <div className="selection-actions">
                <button 
                  className="delete-selected-btn" 
                  onClick={deleteSelectedMessages} 
                  disabled={selectedMessages.size === 0}
                >
                  <DeleteIcon size={18} />
                  {deleteMode === 'me' ? 'Удалить у меня' : 'Удалить у всех'}
                </button>
                <button className="cancel-selection-btn" onClick={() => setDeleteMode(null)}>
                  Назад
                </button>
              </div>
            ) : (
              <div className="selection-actions">
                <button 
                  className="delete-mode-btn delete-own"
                  onClick={() => setDeleteMode('me')}
                >
                  У меня
                </button>
                <button 
                  className="delete-mode-btn delete-all"
                  onClick={() => setDeleteMode('all')}
                >
                  У всех
                </button>
                <button className="cancel-selection-btn" onClick={exitSelectionMode}>
                  Отмена
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2>{chat.name}</h2>
            <div className="header-actions">
              {showSearch ? (
                <div className="search-bar">
                  <input 
                    type="text" 
                    placeholder="Поиск..." 
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <>
                      <span className="search-count">{currentSearchIndex + 1}/{searchResults.length}</span>
                      <button 
                        className="search-nav-btn"
                        onClick={goToPrevResult}
                        title="Предыдущий"
                      >
                        <ChevronUpIcon size={18} />
                      </button>
                      <button 
                        className="search-nav-btn"
                        onClick={goToNextResult}
                        title="Следующий"
                      >
                        <ChevronDownIcon size={18} />
                      </button>
                    </>
                  )}
                  <button 
                    className="search-close-btn"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    className="select-btn" 
                    onClick={() => setShowSearch(true)} 
                    title="Поиск"
                  >
                    <SearchIcon size={20} />
                  </button>
                  <button 
                    className="select-btn" 
                    onClick={() => setShowPinned(!showPinned)} 
                    title="Закрепленные"
                  >
                    <StarIcon size={20} />
                  </button>
                  <button className="select-btn" onClick={() => setSelectionMode(true)} title="Выделить сообщения">
                    <CheckSquareIcon size={20} />
                  </button>
                  {chat.type === 'private' && (
                    <button className="call-btn" onClick={onCall} title="Звонок">
                      <PhoneIcon size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="messages-container" ref={messagesContainerRef}>
        {chat.messages.slice(-50).map(message => (
          <div
            key={message.id}
            data-message-id={message.id}
            className={`message ${message.sender === userId ? 'own' : 'other'} ${selectedMessages.has(message.id) ? 'selected' : ''} ${searchResults.includes(message.id) ? 'search-highlight' : ''} ${searchResults[currentSearchIndex] === message.id ? 'search-active' : ''}`}
            onContextMenu={(e) => !selectionMode && handleContextMenu(e, message.id)}
            onClick={() => selectionMode && toggleMessageSelection(message.id)}
            onMouseEnter={() => { isUserScrolling.current = true; }}
            onMouseLeave={() => { isUserScrolling.current = false; }}
          >
            {selectionMode && (
              <div className="message-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedMessages.has(message.id)}
                  onChange={() => toggleMessageSelection(message.id)}
                />
              </div>
            )}
            <div className="message-content">
              {message.sender !== userId && (
                <div className="message-sender">{message.senderName}</div>
              )}
              {message.type === 'text' && <div className="message-text">{message.text}</div>}
              {message.type === 'sticker' && <div className="message-sticker">{message.stickerId}</div>}
              {message.type === 'photo' && message.photoUrl && (
                <div className="message-photo-container" onClick={() => setPhotoModal({ url: message.photoUrl!, scale: 1 })}>
                  <PhotoIcon size={16} color="var(--primary)" />
                  <img src={message.photoUrl} alt="Photo" className="message-photo" />
                </div>
              )}
              {message.type === 'voice' && message.voiceData && (
                <VoiceMessage duration={message.voiceData.duration} url={message.voiceData.url} />
              )}
              {message.type === 'call' && (
                <div className="message-call">
                  <div className="call-info">
                    ☎️ Звонок {message.callDuration ? `(${formatCallDuration(message.callDuration)})` : ''}
                  </div>
                  {message.sender !== userId && onRecall && (
                    <button className="recall-btn" onClick={onRecall}>
                      Перезвонить
                    </button>
                  )}
                </div>
              )}
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {pinnedMessageId === message.id && <StarFilledIcon size={12} color="var(--primary)" />}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {showScrollButton && (
        <button className="scroll-to-bottom-btn" onClick={scrollToBottom}>
          ↓
        </button>
      )}
      <MessageInput
        onSendMessage={onSendMessage}
        onSendSticker={onSendSticker}
        onSendVoice={onSendVoice}
        onSendPhoto={onSendPhoto}
      />
      {showPinned && (
        <div className="pinned-modal-overlay" onClick={() => setShowPinned(false)}>
          <div className="pinned-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pinned-modal-header">
              <h3>Закрепленные сообщения</h3>
              <button className="close-btn" onClick={() => setShowPinned(false)}>✕</button>
            </div>
            <div className="pinned-modal-content">
              {pinnedMessageId ? (
                chat.messages
                  .filter(msg => msg.id === pinnedMessageId)
                  .map(msg => (
                    <div key={msg.id} className="pinned-item">
                      <div className="pinned-item-content">
                        {msg.type === 'text' && <div className="pinned-text">{msg.text}</div>}
                        {msg.type === 'sticker' && <div className="pinned-sticker">{msg.stickerId}</div>}
                      </div>
                      <div className="pinned-item-time">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-pinned">Нет закрепленных сообщений</div>
              )}
            </div>
          </div>
        </div>
      )}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <div className="context-menu-header">
            <span>Действия с сообщением</span>
          </div>
          <div className="context-menu-divider" />
          {onReplyMessage && (
            <button 
              className="context-menu-item"
              onClick={() => {
                console.log('Reply clicked, calling:', onReplyMessage);
                onReplyMessage(contextMenu.messageId);
                setContextMenu(null);
              }}
            >
              <ReplyIcon size={16} />
              <span>Ответить</span>
            </button>
          )}
          {onPinMessage && (
            <button 
              className="context-menu-item"
              onClick={() => {
                console.log('Pin clicked, calling:', onPinMessage);
                onPinMessage(contextMenu.messageId);
                setContextMenu(null);
              }}
            >
              {pinnedMessageId === contextMenu.messageId ? (
                <StarFilledIcon size={16} color="var(--primary)" />
              ) : (
                <StarIcon size={16} />
              )}
              <span>Закрепить</span>
            </button>
          )}
          <button 
            className="context-menu-item delete-own"
            onClick={() => handleDeleteClick(contextMenu.messageId, false)}
          >
            <DeleteIcon size={16} />
            <span>Удалить у меня</span>
          </button>
          <button 
            className="context-menu-item delete-all"
            onClick={() => handleDeleteClick(contextMenu.messageId, true)}
          >
            <DeleteIcon size={16} />
            <span>Удалить у всех</span>
          </button>
        </div>
      )}
      {photoModal && (
        <div className="photo-modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <button className="photo-modal-close" onClick={() => setPhotoModal(null)}>✕</button>
            <div className="photo-modal-controls">
              <button 
                className="photo-control-btn"
                onClick={() => setPhotoModal({ ...photoModal, scale: Math.max(1, photoModal.scale - 0.2), offsetX: 0, offsetY: 0 })}
                title="Уменьшить"
              >
                <ZoomOutIcon size={18} />
              </button>
              <span className="photo-scale">{Math.round(photoModal.scale * 100)}%</span>
              <button 
                className="photo-control-btn"
                onClick={() => setPhotoModal({ ...photoModal, scale: Math.min(3, photoModal.scale + 0.2) })}
                title="Увеличить"
              >
                <ZoomInIcon size={18} />
              </button>
              <a 
                href={photoModal.url}
                download="photo.png"
                className="photo-download-btn"
                title="Скачать"
              >
                <DownloadIcon size={18} />
              </a>
            </div>
            <div className="photo-modal-image-container">
              <img 
                src={photoModal.url} 
                alt="Full size" 
                className="photo-modal-image"
                onMouseDown={handlePhotoMouseDown}
                style={{ 
                  transform: `scale(${photoModal.scale}) translate(${photoModal.offsetX || 0}px, ${photoModal.offsetY || 0}px)`,
                  cursor: photoModal.scale > 1 ? 'grab' : 'default'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
