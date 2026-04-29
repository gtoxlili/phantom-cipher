import { createSignal, For, Show, type JSX } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { Motion, Presence } from 'solid-motionone';
import { spring } from '@motionone/dom';
import clsx from 'clsx';
import { Sketch } from '@/components/Sketch';
import { ArrowLeftIcon, PlayIcon, SparkleIcon } from '@/components/icons';
import { myName, setIntentHost, setMyName } from '@/stores/game';
import { pickRandomCodename } from '@/lib/codenames';
import * as s from './Home.css';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const genCode = (): string => {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
};

type Mode = 'menu' | 'create' | 'join';

// Persona-style panel transition. Motion One doesn't have framer-motion's
// staggerChildren / when:beforeChildren, so the per-item delay is
// expressed inline on each child instead. The parent slides in first
// (~280ms spring), then children fade up at base+stagger offsets — same
// rhythm as the original `beforeChildren` + `staggerChildren: 0.07`.
const panelEnter = { opacity: 1, x: 0 };
const panelInitial = { opacity: 0, x: -28 };
const panelExit = { opacity: 0, x: 32 };
const panelEnterTransition = { easing: spring({ stiffness: 320, damping: 26 }) };
const panelExitTransition = {
  duration: 0.18,
  easing: [0.6, 0, 0.4, 1] as [number, number, number, number],
};

// Children wait for the parent slide before staggering in.
const CHILD_BASE_DELAY = 0.18;

const itemInitial = { opacity: 0, y: 14 };
const itemEnter = { opacity: 1, y: 0 };
const itemExit = { opacity: 0, y: -10, transition: { duration: 0.14 } };
const itemEnterTransition = (delay: number) => ({
  delay: CHILD_BASE_DELAY + delay,
  easing: spring({ stiffness: 380, damping: 28 }),
});

export default function Home() {
  // useSearchParams returns a getter store; read .intent reactively.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = createSignal('');
  // PWA shortcuts launch with `?intent=create|join` so long-press
  // home-screen actions skip straight into the matching panel. Read
  // once on mount; the in-page back/forward between menu and forms
  // is handled by local state — keeping URL in sync would require
  // either an extra dep or scattered nav calls for very little payoff
  // on a 3-mode toggle.
  const intent = (() => {
    const raw = searchParams.intent;
    return Array.isArray(raw) ? raw[0] : raw;
  })();
  const initialMode: Mode = intent === 'create' || intent === 'join' ? intent : 'menu';
  const [mode, setMode] = createSignal<Mode>(initialMode);
  const [error, setError] = createSignal('');
  // Track last shuffled index so consecutive clicks don't repeat.
  let lastShuffleIdx = -1;

  const shuffleName = () => {
    const { name: picked, index } = pickRandomCodename(lastShuffleIdx);
    lastShuffleIdx = index;
    setMyName(picked);
    setError('');
  };

  // Stored values arrive hydrated from sessionStorage at signal init,
  // so no manual rehydration needed here.

  const goCreate = () => {
    const trimmed = (myName() ?? '').trim();
    if (!trimmed) return setError('Name required');
    const newCode = genCode();
    setMyName(trimmed);
    setIntentHost(true);
    navigate(`/room/${newCode}`);
  };

  const goJoin = () => {
    const trimmed = (myName() ?? '').trim();
    if (!trimmed) return setError('Name required');
    if (!/^[A-Za-z0-9]{4}$/.test(code().trim())) return setError('Code must be 4 chars');
    setMyName(trimmed);
    setIntentHost(false);
    navigate(`/room/${code().trim().toUpperCase()}`);
  };

  return (
    <main class={s.main}>
      <Sketch />

      <section class={s.titleArea}>
        <div class={s.titleBlock}>
          <div class={s.titleEyebrow}><span>· EST · MMXXVI · TOKYO ·</span></div>
          <h1 class={s.title}>
            <span class={s.titleRow1}><span class={s.titleText}>达芬奇</span></span>
            <span class={s.titleRow2}><span class={s.titleText}>密码</span></span>
          </h1>
          <div class={s.subtitle}>DA VINCI'S CIPHER</div>
        </div>

        <Presence exitBeforeEnter>
          <Show when={mode() === 'menu'}>
            <Motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div class={s.hook}>
                <em>TAKE THEIR CIPHER.</em> 二十四块刻着数字的木牌——藏匿与显露之间，用你的演绎与直觉，
                <em>破译</em>每一块尚未现身的密码。
              </div>
            </Motion.div>
          </Show>
        </Presence>
      </section>

      <section class={s.contentArea}>
        <Presence exitBeforeEnter>
          <Show when={mode() === 'menu'}>
            <Motion.div
              initial={panelInitial}
              animate={panelEnter}
              exit={{ ...panelExit, transition: panelExitTransition }}
              transition={panelEnterTransition}
            >
              <div class={s.actions}>
                <Motion.div
                  initial={itemInitial}
                  animate={itemEnter}
                  exit={itemExit}
                  transition={itemEnterTransition(0)}
                >
                  <button
                    class={s.btnPrimary}
                    onClick={() => { setError(''); setMode('create'); }}
                    type="button"
                  >
                    <span class={s.btnLabel}>
                      <span class={s.btnTextRow}>
                        <span>创建棋局</span>
                        <span class={s.btnSubLight}>CREATE NEW</span>
                      </span>
                    </span>
                    <span class={s.btnArrow}><PlayIcon size="1em" /></span>
                  </button>
                </Motion.div>
                <Motion.div
                  initial={itemInitial}
                  animate={itemEnter}
                  exit={itemExit}
                  transition={itemEnterTransition(0.07)}
                >
                  <button
                    class={s.btnSecondary}
                    onClick={() => { setError(''); setMode('join'); }}
                    type="button"
                  >
                    <span class={s.btnLabel}>
                      <span class={s.btnTextRow}>
                        <span>持密码入局</span>
                        <span class={s.btnSubDark}>ENTER WITH CODE</span>
                      </span>
                    </span>
                    <span class={s.btnArrow}><PlayIcon size="1em" /></span>
                  </button>
                </Motion.div>
              </div>

              <Motion.div
                class={s.howto}
                initial={itemInitial}
                animate={itemEnter}
                exit={itemExit}
                transition={itemEnterTransition(0.14)}
              >
                <details>
                  <summary class={s.howtoSummary}>· How to Play / 玩法简述 ·</summary>
                  <div class={s.howtoBox}>
                    <p>抽取数张数字牌（黑白共 0–11 各一份），按数字升序排列，同数时黑前白后。</p>
                    <p>每回合：抽一张新牌做「暂置」，任选对手一张未亮明的牌，宣告一个数字。</p>
                    <p>命中──对手翻明该牌，你可继续，亦可收手（暂置牌仍藏匿）。</p>
                    <p>失手──你必须把暂置那张牌翻明示众，回合结束。</p>
                    <p>当只剩你一人尚有藏匿之牌──<strong>YOU WIN</strong>。</p>
                  </div>
                </details>
              </Motion.div>
            </Motion.div>
          </Show>

          <Show when={mode() === 'create'}>
            <Motion.div
              initial={panelInitial}
              animate={panelEnter}
              exit={{ ...panelExit, transition: panelExitTransition }}
              transition={panelEnterTransition}
            >
              <RoomForm
                title="创建棋局"
                submitLabel={
                  <span style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35em' }}>
                    开局<PlayIcon size="0.85em" />
                  </span>
                }
                error={error()}
                onBack={() => { setMode('menu'); setError(''); }}
                onSubmit={goCreate}
                fields={[
                  {
                    key: 'name',
                    label: 'Codename · 你的代号',
                    value: () => myName() ?? '',
                    onChange: (v) => { setMyName(v); setError(''); },
                    placeholder: 'JOKER',
                    maxLength: 16,
                    autoFocus: true,
                    onShuffle: shuffleName,
                  },
                ]}
              />
            </Motion.div>
          </Show>

          <Show when={mode() === 'join'}>
            <Motion.div
              initial={panelInitial}
              animate={panelEnter}
              exit={{ ...panelExit, transition: panelExitTransition }}
              transition={panelEnterTransition}
            >
              <RoomForm
                title="持密码入局"
                submitLabel={
                  <span style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35em' }}>
                    进入<PlayIcon size="0.85em" />
                  </span>
                }
                error={error()}
                onBack={() => { setMode('menu'); setError(''); }}
                onSubmit={goJoin}
                fields={[
                  {
                    key: 'name',
                    label: 'Codename · 你的代号',
                    value: () => myName() ?? '',
                    onChange: (v) => { setMyName(v); setError(''); },
                    placeholder: 'JOKER',
                    maxLength: 16,
                    autoFocus: true,
                    onShuffle: shuffleName,
                  },
                  {
                    key: 'code',
                    label: 'Cipher Key · 房间密码',
                    value: () => code(),
                    onChange: (v) => { setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)); setError(''); },
                    placeholder: 'XXXX',
                    maxLength: 4,
                    mono: true,
                  },
                ]}
              />
            </Motion.div>
          </Show>
        </Presence>
      </section>

      <a href="/stats" class={s.statsLink} aria-label="排行榜">
        <span>★ 排行榜 // STATS</span>
      </a>

      <footer class={s.footer}>made with ink &amp; pixels</footer>
    </main>
  );
}

interface FieldDef {
  key: string;
  label: string;
  /** Accessor — Solid 反应式：组件 setup 阶段只跑一次，靠 getter 在每次
   *  渲染或变化时重新读取最新值。如果改回 `value: string`，父组件每次
   *  改 signal 都会让 fields 数组引用换新，下面的 <For> 会拆掉重挂载，
   *  输入框失焦、光标跳到末尾——这就是 React→Solid 迁移的经典坑。 */
  value: () => string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  mono?: boolean;
  autoFocus?: boolean;
  /** When set, render a small SHUFFLE pill below the input. */
  onShuffle?: () => void;
}

function RoomForm(props: {
  title: string;
  submitLabel: JSX.Element;
  fields: FieldDef[];
  error: string;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <form class={s.form} onSubmit={(e) => { e.preventDefault(); props.onSubmit(); }}>
      <h2 class={s.formTitle}><span>{props.title}</span></h2>
      {/* 必须用 <For>：父组件每次 signal 变更都会让 fields 数组引用刷新，
          原来的 `.map()` 会在 setup 阶段执行一次，要么把 input 永久绑死成
          初值，要么每次 signal 变都拆掉重挂载（焦点丢失、光标跳到末尾）。
          For 配合稳定 key 让 input 元素跨更新复用。
          `f.value` 类型已改成 `() => string` 的 accessor —— `value={f.value()}`
          才是真正反应式的绑定，跟 React 的 `value={f.value}` 行为对齐。 */}
      <For each={props.fields}>
        {(f) => (
          <label class={s.field}>
            <span class={s.fieldLabel}>{f.label}</span>
            <input
              class={clsx(f.mono ? s.inputMono : s.input)}
              value={f.value()}
              onInput={(e) => f.onChange(e.currentTarget.value)}
              placeholder={f.placeholder}
              maxLength={f.maxLength}
              autofocus={f.autoFocus}
              inputMode={f.mono ? 'text' : undefined}
              autocapitalize={f.mono ? 'characters' : 'off'}
              autocomplete="off"
              spellcheck={false}
            />
            <Show when={f.onShuffle}>
              <button type="button" class={s.shuffleBtn} onClick={() => f.onShuffle?.()}>
                <span class={s.shuffleIcon}><SparkleIcon size="1em" /></span>
                <span>随机代号 / SHUFFLE</span>
                <span class={s.shuffleIcon}><SparkleIcon size="1em" /></span>
              </button>
            </Show>
          </label>
        )}
      </For>
      <Show when={props.error}>
        <div class={s.error}>{props.error}</div>
      </Show>
      <div class={s.formActions}>
        <button
          type="button"
          class={s.btnText}
          onClick={props.onBack}
          style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.35em' }}
        >
          <ArrowLeftIcon size="1em" />BACK
        </button>
        <button type="submit" class={s.submit}>
          <span class={s.btnLabel}>{props.submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
