import React, { useState } from 'react';
import { searchUser, createPrivateChat } from '../lib/messages';
import { SearchIcon } from './Icons';
import '../styles/UserSearch.css';

interface UserSearchProps {
  userId: string;
  onChatCreated: (chatId: string, chatName: string) => void;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  email: string;
  username: string;
  userId: string;
}

export function UserSearch({ userId, onChatCreated, onClose }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setSearchResult(null);

    try {
      const user = await searchUser(searchQuery.trim()) as SearchResult | null;
      if (user && user.id !== userId) {
        setSearchResult(user);
      } else if (user && user.id === userId) {
        setError('Это ты сам');
      } else {
        setError('Пользователь не найден');
      }
    } catch (err: any) {
      setError('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!searchResult) return;

    setLoading(true);
    try {
      const chat = await createPrivateChat(userId, searchResult.id, searchResult.username);
      onChatCreated(chat.id, chat.name);
      onClose();
    } catch (err: any) {
      setError('Ошибка создания чата');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-search-overlay" onClick={onClose}>
      <div className="user-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-search-header">
          <h3>Найти пользователя</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSearch} className="user-search-form">
          <div className="search-input-wrapper">
            <SearchIcon size={18} />
            <input
              type="text"
              placeholder="Введи ID пользователя..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading || !searchQuery.trim()}>
            {loading ? 'Поиск...' : 'Найти'}
          </button>
        </form>

        {error && <div className="search-error">{error}</div>}

        {searchResult && (
          <div className="search-result">
            <div className="result-info">
              <div className="result-username">{searchResult.username}</div>
              <div className="result-id">ID: {searchResult.userId}</div>
              <div className="result-email">{searchResult.email}</div>
            </div>
            <button
              className="add-contact-btn"
              onClick={handleAddContact}
              disabled={loading}
            >
              {loading ? 'Добавляю...' : 'Добавить'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
