'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { Sketch } from '@/components/Sketch';
import { myNameAtom } from '@/lib/atoms';
import clsx from 'clsx';
import * as s from './page.css';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const genCode = (): string => {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
};

type Mode = 'menu' | 'create' | 'join';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useAtom(myNameAtom);
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<Mode>('menu');
  const [error, setError] = useState('');

  useEffect(() => {
    if (name) return;
    const saved = sessionStorage.getItem('davinci-name');
    if (saved) setName(saved);
  }, [name, setName]);

  const goCreate = () => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return setError('Name required');
    const newCode = genCode();
    sessionStorage.setItem('davinci-name', trimmed);
    sessionStorage.setItem('davinci-host', '1');
    router.push(`/room/${newCode}`);
  };

  const goJoin = () => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return setError('Name required');
    if (!/^[A-Za-z0-9]{4}$/.test(code.trim())) return setError('Code must be 4 chars');
    sessionStorage.setItem('davinci-name', trimmed);
    sessionStorage.removeItem('davinci-host');
    router.push(`/room/${code.trim().toUpperCase()}`);
  };

  return (
    <main className={s.main}>
      <Sketch />

      <div className={s.titleBlock}>
        <div className={s.titleEyebrow}><span>· EST · MMXXVI · TOKYO ·</span></div>
        <h1 className={s.title}>
          <span className={s.titleRow1}><span className={s.titleText}>达芬奇</span></span>
          <span className={s.titleRow2}><span className={s.titleText}>密码</span></span>
        </h1>
        <div className={s.subtitle}>DA VINCI&apos;S CIPHER</div>
      </div>

      {mode === 'menu' && (
        <>
          <div className={s.hook}>
            <em>TAKE THEIR CIPHER.</em> 二十四块刻着数字的木牌——藏匿与显露之间，用你的演绎与直觉，
            <em>破译</em>每一块尚未现身的密码。
          </div>

          <div className={s.actions}>
            <button
              className={s.btnPrimary}
              onClick={() => { setError(''); setMode('create'); }}
              type="button"
            >
              <span className={s.btnLabel}>
                <span className={s.btnTextRow}>
                  <span>创建棋局</span>
                  <span className={s.btnSubLight}>CREATE NEW</span>
                </span>
              </span>
              <span className={s.btnArrow}>▶</span>
            </button>
            <button
              className={s.btnSecondary}
              onClick={() => { setError(''); setMode('join'); }}
              type="button"
            >
              <span className={s.btnLabel}>
                <span className={s.btnTextRow}>
                  <span>持密码入局</span>
                  <span className={s.btnSubDark}>ENTER WITH CODE</span>
                </span>
              </span>
              <span className={s.btnArrow}>▶</span>
            </button>
          </div>

          <div className={s.howto}>
            <details>
              <summary className={s.howtoSummary}>· How to Play / 玩法简述 ·</summary>
              <div className={s.howtoBox}>
                <p>抽取数张数字牌（黑白共 0–11 各一份），按数字升序排列，同数时黑前白后。</p>
                <p>每回合：抽一张新牌做「暂置」，任选对手一张未亮明的牌，宣告一个数字。</p>
                <p>命中──对手翻明该牌，你可继续，亦可收手（暂置牌仍藏匿）。</p>
                <p>失手──你必须把暂置那张牌翻明示众，回合结束。</p>
                <p>当只剩你一人尚有藏匿之牌──<strong>YOU WIN</strong>。</p>
              </div>
            </details>
          </div>
        </>
      )}

      {mode === 'create' && (
        <RoomForm
          title="创建棋局"
          submitLabel="开局 ▶"
          error={error}
          onBack={() => { setMode('menu'); setError(''); }}
          onSubmit={goCreate}
          fields={[
            {
              key: 'name',
              label: 'Codename · 你的代号',
              value: name ?? '',
              onChange: (v) => { setName(v); setError(''); },
              placeholder: 'JOKER',
              maxLength: 16,
              autoFocus: true,
            },
          ]}
        />
      )}

      {mode === 'join' && (
        <RoomForm
          title="持密码入局"
          submitLabel="进入 ▶"
          error={error}
          onBack={() => { setMode('menu'); setError(''); }}
          onSubmit={goJoin}
          fields={[
            {
              key: 'name',
              label: 'Codename · 你的代号',
              value: name ?? '',
              onChange: (v) => { setName(v); setError(''); },
              placeholder: 'JOKER',
              maxLength: 16,
              autoFocus: true,
            },
            {
              key: 'code',
              label: 'Cipher Key · 房间密码',
              value: code,
              onChange: (v) => { setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)); setError(''); },
              placeholder: 'XXXX',
              maxLength: 4,
              mono: true,
            },
          ]}
        />
      )}

      <footer className={s.footer}>made with ink &amp; pixels</footer>
    </main>
  );
}

interface FieldDef {
  key: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  mono?: boolean;
  autoFocus?: boolean;
}

function RoomForm({
  title,
  submitLabel,
  fields,
  error,
  onSubmit,
  onBack,
}: {
  title: string;
  submitLabel: string;
  fields: FieldDef[];
  error: string;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <h2 className={s.formTitle}><span>{title}</span></h2>
      {fields.map((f) => (
        <label key={f.key} className={s.field}>
          <span className={s.fieldLabel}>{f.label}</span>
          <input
            className={clsx(f.mono ? s.inputMono : s.input)}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            placeholder={f.placeholder}
            maxLength={f.maxLength}
            autoFocus={f.autoFocus}
            inputMode={f.mono ? 'text' : undefined}
            autoCapitalize={f.mono ? 'characters' : 'off'}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      ))}
      {error && <div className={s.error}>{error}</div>}
      <div className={s.formActions}>
        <button type="button" className={s.btnText} onClick={onBack}>← BACK</button>
        <button type="submit" className={s.submit}>
          <span className={s.btnLabel}>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
