import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'segmented' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'segmented',
  className = ''
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % items.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + items.length) % items.length;
    } else {
      return;
    }
    e.preventDefault();
    const nextItem = items[nextIndex];
    if (nextItem) {
      onChange(nextItem.id);
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  if (variant === 'underline') {
    return (
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Pestañas de navegación"
        className={`flex border-b border-gray-200 dark:border-ink-border gap-6 overflow-x-auto ${className}`}
      >
        {items.map((tab, idx) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`pb-3 pt-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-ink-muted hover:text-ink dark:hover:text-white'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[12px] font-bold ${
                    isActive
                      ? 'bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Pestañas de navegación"
      className={`flex bg-gray-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-gray-200/50 dark:border-zinc-700/50 gap-1 overflow-x-auto ${className}`}
    >
      {items.map((tab, idx) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-ink-surface text-ink dark:text-white shadow-xs'
                : 'text-ink-muted hover:text-ink dark:hover:text-white hover:bg-white/40'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[12px] font-bold ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300'
                    : 'bg-gray-200/70 dark:bg-zinc-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
