'use client';

import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { CheckIcon } from '@phosphor-icons/react';
import { currentRoomCodeAtom, showLogAtom } from '@/lib/atoms';
import * as s from './Header.css';

export function Header({ onBack }: { onBack: () => void }) {
  const code = useAtomValue(currentRoomCodeAtom);
  const setShowLog = useSetAtom(showLogAtom);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <header className={s.header}>
      <button className={s.iconBtn} onClick={onBack} aria-label="返回">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M12 4 L6 10 L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={s.codeWrap} onClick={copyLink}>
        <span className={s.codeLabel}>· CIPHER KEY ·</span>
        <span className={s.code}>{code}</span>
        <span
          className={s.copyHint}
          style={copied ? { display: 'inline-flex', alignItems: 'center', gap: '0.35em' } : undefined}
        >
          {copied ? (
            <>COPIED<CheckIcon weight="bold" size="0.9em" /></>
          ) : (
            'TAP TO SHARE'
          )}
        </span>
      </div>
      <button className={s.iconBtn} onClick={() => setShowLog((v) => !v)} aria-label="日志">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}
