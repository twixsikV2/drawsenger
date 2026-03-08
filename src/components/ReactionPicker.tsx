import React, { useState } from 'react';
import '../styles/ReactionPicker.css';

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
  onClose: () => void;
}

const REACTION_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '🤐', '🤨', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤮', '🤢', '🤮', '🤮', '🤮'],
  people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🦾', '🦿', '👂', '👃', '🧠', '🦷', '🦴', '🫀', '🫁'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🧐', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦗', '🥚', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🍯', '🥛', '🍼', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃'],
  nature: ['🌸', '🌼', '🌻', '🌺', '🌷', '🌹', '🥀', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌍', '🌎', '🌏', '💐', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔'],
  objects: ['⚽', '⚾', '🥎', '🎾', '🏐', '🏈', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '⛸️', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🛷', '🥌', '🎯', '🪀', '🪁', '🎮', '🎲', '♠️', '♥️', '♦️', '♣️', '♟️', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪔', '🔭', '🔬', '💉', '💊', '🚪', '🛗', '🪒', '🧴', '🧷', '🧹', '🧺', '🧻', '🪣', '🪠', '🧼', '🪡', '🧽', '🧯', '🛒', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⌛', '⏳', '⏱️', '⏲️', '🧰', '🔐', '🔒', '🔓', '🔑', '🗝️', '🚪', '🪑', '🚽', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎️', '🔔', '🔕', '🧯'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💜', '💛', '💚', '💙', '🧡', '❤️', '🤍', '🤎', '🖤', '💋', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🦾', '🦿', '👂', '👃', '🧠', '🦷', '🦴', '🫀', '🫁', '🦫'],
};

export function ReactionPicker({ onSelectReaction, onClose }: ReactionPickerProps) {
  const [activeTab, setActiveTab] = useState<keyof typeof REACTION_CATEGORIES>('smileys');

  return (
    <div className="reaction-picker-overlay" onClick={onClose}>
      <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
        <div className="reaction-picker-header">
          <h3>Реакции</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="reaction-picker-tabs">
          {Object.keys(REACTION_CATEGORIES).map((category) => (
            <button
              key={category}
              className={`tab-btn ${activeTab === category ? 'active' : ''}`}
              onClick={() => setActiveTab(category as keyof typeof REACTION_CATEGORIES)}
            >
              {category === 'smileys' && '😊'}
              {category === 'people' && '👋'}
              {category === 'animals' && '🐶'}
              {category === 'nature' && '🌸'}
              {category === 'objects' && '⚽'}
              {category === 'symbols' && '❤️'}
            </button>
          ))}
        </div>

        <div className="reaction-picker-content">
          {REACTION_CATEGORIES[activeTab].map((emoji) => (
            <button
              key={emoji}
              className="reaction-emoji"
              onClick={() => {
                onSelectReaction(emoji);
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
