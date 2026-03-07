import React from 'react';
import '../styles/StickerPicker.css';

const STICKERS = ['😀', '😂', '❤️', '🔥', '👍', '🎉', '🚀', '💯', '😍', '😢', '😡', '🤔'];

interface StickerPickerProps {
  onSelectSticker: (sticker: string) => void;
  onClose: () => void;
}

export function StickerPicker({ onSelectSticker, onClose }: StickerPickerProps) {
  return (
    <div className="sticker-picker-overlay" onClick={onClose}>
      <div className="sticker-picker" onClick={(e) => e.stopPropagation()}>
        <div className="sticker-grid">
          {STICKERS.map((sticker) => (
            <button
              key={sticker}
              className="sticker-btn"
              onClick={() => {
                onSelectSticker(sticker);
                onClose();
              }}
            >
              {sticker}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
