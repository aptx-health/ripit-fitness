'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxLength?: number;
  error?: string;
}

export default function TagInput({
  value = [],
  onChange,
  placeholder = 'Type and press Enter...',
  maxTags,
  maxLength = 50,
  error,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(value.length - 1);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) return;

    if (maxTags && value.length >= maxTags) {
      return;
    }

    if (trimmedValue.length > maxLength) {
      return;
    }

    // Avoid duplicates
    if (value.includes(trimmedValue)) {
      setInputValue('');
      return;
    }

    onChange([...value, trimmedValue]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div
        onClick={focusInput}
        className={`
          min-h-[42px] px-3 py-2 border-2 rounded
          bg-background text-foreground
          cursor-text flex flex-wrap gap-2 items-center
          ${error ? 'border-error' : 'border-border focus-within:border-primary'}
        `}
      >
        {/* Tags */}
        {value.map((tag, index) => (
          <span
            key={index}
            className="
              inline-flex items-center gap-1 px-2 py-1
              bg-primary text-primary-foreground
              text-sm font-medium uppercase tracking-wide
              shadow-[0_2px_0_0_#9A3412]
              hover:shadow-[0_1px_0_0_#9A3412] hover:translate-y-[1px]
              transition-all
            "
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="hover:bg-primary-hover p-0.5 rounded"
              aria-label={`Remove ${tag}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Input */}
        {(!maxTags || value.length < maxTags) && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={value.length === 0 ? placeholder : ''}
            maxLength={maxLength}
            className="
              flex-1 min-w-[120px] bg-transparent outline-none
              text-foreground placeholder:text-muted-foreground
            "
          />
        )}
      </div>

      {/* Helper text */}
      {error && (
        <p className="text-sm text-error font-medium">{error}</p>
      )}

      {maxTags && value.length >= maxTags && (
        <p className="text-sm text-muted-foreground">
          Maximum {maxTags} tags reached
        </p>
      )}
    </div>
  );
}
