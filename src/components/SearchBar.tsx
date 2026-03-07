import React from 'react';
import { SearchIcon } from './Icons';
import '../styles/SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <SearchIcon size={16} />
        <input
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder="Поиск..."
          className="search-input"
        />
      </div>
    </div>
  );
}
