'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAtom, useSetAtom } from 'jotai';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftIcon, PlayIcon, SparkleIcon } from '@phosphor-icons/react';
import { Sketch } from '@/components/Sketch';
import { intentHostAtom, myNameAtom } from '@/lib/atoms';
import { pickRandomCodename } from '@/lib/codenames';
import * as s from './page.css';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const genCode = (): string => {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
};

type Mode = 'menu' | 'create' | 'join';

/**
 * Persona-style panel transition. Only the wrapper animates (opacity + x);
 * inner buttons keep their CSS skewX(-8deg) untouched. Children stagger via
 * variants — enter waits for parent (`beforeChildren`), exit reverses.
 */
const panelVariants = {
  initial: { opacity: 0, x: -28 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 320,
      damping: 26,
      when: 'beforeChildren' as const,
      staggerChildren: 0.07,
    },
  },
  exit: {
    opacity: 0,
    x: 32,
    transition: {
      duration: 0.18,
      ease: [0.6, 0, 0.4, 1] as [number, number, number, number],
      when: 'afterChildren' as const,
      staggerChildren: 0.04,
      staggerDirection: -1 as const,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.14 } },
};

/**
 * Suspense fallback — renders only the static brand chrome (Sketch
 * background + title block) without the action panel that depends on
 * `useSearchParams()`. The action panel will mount in via its existing
 * AnimatePresence panel transition once HomeInner resolves, so the
 * loading→ready handoff feels like the panel "slides in" rather than
 * a hard swap.
 */
function HomeFallback() {
  return (
    <main className={s.main}>
      <Sketch />
      <section className={s.titleArea}>
        <div className={s.titleBlock}>
          <div className={s.titleEyebrow}>
            <span>· EST · MMXXVI · TOKYO ·</span>
          </div>
          <h1 className={s.title}>
            <span className={s.titleRow1}><span className={s.titleText}>达芬奇</span></span>
            <span className={s.titleRow2}><span className={s.titleText}>密码</span></span>
          </h1>
          <div className={s.subtitle}>DA VINCI&apos;S CIPHER</div>
        </div>
      </section>
    </main>
  );
}

/**
 * Wrap everything that touches `useSearchParams()` in a Suspense
 * boundary so Next.js can prerender the static shell at build time
 * without bailing out to client-only render.
 */
export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useAtom(myNameAtom);
  const setIntentHost = useSetAtom(intentHostAtom);
  const [code, setCode] = useState('');
  // PWA shortcuts launch with `?intent=create|join` so long-press
  // home-screen actions skip straight into the matching panel. Read
  // once on mount; the in-page back/forward between menu and forms
  // is handled by local state — keeping URL in sync would require
  // either an extra dep (nuqs) or scattered router.replace() calls
  // for very little payoff on a 3-mode toggle.
  const intent = searchParams.get('intent');
  const initialMode: Mode = intent === 'create' || intent === 'join' ? intent : 'menu';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState('');
  // Track last shuffled index so consecutive clicks don't repeat.
  const lastShuffleIdxRef = useRef(-1);

  const shuffleName = () => {
    const { name: picked, index } = pickRandomCodename(lastShuffleIdxRef.current);
    lastShuffleIdxRef.current = index;
    setName(picked);
    setError('');
  };

  // Atom values arrive hydrated from sessionStorage (atomWithStorage with
  // getOnInit), so no manual rehydration needed here.

  const goCreate = () => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return setError('Name required');
    const newCode = genCode();
    // Go through atom setters — atomWithStorage JSON-encodes the values,
    // which is what /room/[code] reads on mount. Writing raw strings via
    // sessionStorage.setItem here would corrupt the encoding (e.g. "1"
    // would parse back as the number 1 instead of the boolean true).
    setName(trimmed);
    setIntentHost(true);
    router.push(`/room/${newCode}`);
  };

  const goJoin = () => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return setError('Name required');
    if (!/^[A-Za-z0-9]{4}$/.test(code.trim())) return setError('Code must be 4 chars');
    setName(trimmed);
    setIntentHost(false);
    router.push(`/room/${code.trim().toUpperCase()}`);
  };

  return (
    <main className={s.main}>
      <Sketch />

      <section className={s.titleArea}>
        <div className={s.titleBlock}>
          <div className={s.titleEyebrow}><span>· EST · MMXXVI · TOKYO ·</span></div>
          <h1 className={s.title}>
            <span className={s.titleRow1}><span className={s.titleText}>达芬奇</span></span>
            <span className={s.titleRow2}><span className={s.titleText}>密码</span></span>
          </h1>
          <div className={s.subtitle}>DA VINCI&apos;S CIPHER</div>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {mode === 'menu' && (
            <motion.div
              key="hook"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className={s.hook}>
                <em>TAKE THEIR CIPHER.</em> 二十四块刻着数字的木牌——藏匿与显露之间，用你的演绎与直觉，
                <em>破译</em>每一块尚未现身的密码。
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className={s.contentArea}>
        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div
              key="menu"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className={s.actions}>
                <motion.div variants={itemVariants}>
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
                    <span className={s.btnArrow}><PlayIcon weight="fill" size="1em" /></span>
                  </button>
                </motion.div>
                <motion.div variants={itemVariants}>
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
                    <span className={s.btnArrow}><PlayIcon weight="fill" size="1em" /></span>
                  </button>
                </motion.div>
              </div>

              <motion.div className={s.howto} variants={itemVariants}>
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
              </motion.div>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div
              key="create"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <RoomForm
                title="创建棋局"
                submitLabel={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}>
                    开局<PlayIcon weight="fill" size="0.85em" />
                  </span>
                }
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
                    onShuffle: shuffleName,
                  },
                ]}
              />
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              key="join"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <RoomForm
                title="持密码入局"
                submitLabel={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}>
                    进入<PlayIcon weight="fill" size="0.85em" />
                  </span>
                }
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
                    onShuffle: shuffleName,
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
            </motion.div>
          )}
        </AnimatePresence>
      </section>

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
  /** When set, render a small SHUFFLE pill below the input. */
  onShuffle?: () => void;
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
  submitLabel: React.ReactNode;
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
          {f.onShuffle && (
            <button type="button" className={s.shuffleBtn} onClick={f.onShuffle}>
              <span className={s.shuffleIcon}><SparkleIcon weight="fill" size="1em" /></span>
              <span>随机代号 / SHUFFLE</span>
              <span className={s.shuffleIcon}><SparkleIcon weight="fill" size="1em" /></span>
            </button>
          )}
        </label>
      ))}
      {error && <div className={s.error}>{error}</div>}
      <div className={s.formActions}>
        <button
          type="button"
          className={s.btnText}
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}
        >
          <ArrowLeftIcon weight="bold" size="1em" />BACK
        </button>
        <button type="submit" className={s.submit}>
          <span className={s.btnLabel}>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
