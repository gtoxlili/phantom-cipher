/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { MetaProvider } from '@solidjs/meta';
import { ErrorBoundary, lazy, type JSX } from 'solid-js';

// Self-host the Latin display + body faces via fontsource. fonts.googleapis.com
// is unreliable inside mainland China (firewalled / inconsistent), so we
// bundle the woff2 files into our own dist and serve them from /assets/.
// Chinese characters fall back to the system font stack — PingFang SC on
// Apple, Microsoft YaHei on Windows, Source Han Sans on Linux/Android —
// which look as good as Noto Sans SC and avoid shipping a multi-megabyte
// CJK web font for every user.
import '@fontsource/bebas-neue/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/900.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';

// 早 import identity 是为了让 FingerprintJS 在 Home 页用户输入
// 昵称那几秒就开始算指纹，而不是等导航到 /room/:code 才启动。
// 一进 Room 几乎肯定已经算完，没有"等指纹"的卡顿
import '@/stores/identity';

import 'styled-system/styles.css';
import './styles/global.css';

const Home = lazy(() => import('./routes/Home'));
const Room = lazy(() => import('./routes/Room'));

/**
 * Last-resort fallback when a render path throws — broken msgpack
 * payload, a Solid signal landing in an unexpected shape, or any
 * other invariant break that would otherwise leave the user with
 * a blank page. Keeps the visual language (P5 italic, blood red,
 * skewed) so an error feels like part of the world rather than a
 * stack trace dump.
 */
function FatalError(props: { err: unknown; reset: () => void }): JSX.Element {
  const message = () =>
    props.err instanceof Error ? props.err.message : String(props.err);
  return (
    <main
      style={{
        'min-height': '100dvh',
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        gap: '1.2em',
        padding: '4vh 8vw',
        background: '#0a0a0a',
        color: '#fafaf3',
        'font-family': "'Bebas Neue', sans-serif",
        'text-align': 'center',
      }}
    >
      <div
        style={{
          'font-size': 'clamp(40px, 12vw, 96px)',
          'font-style': 'italic',
          color: '#e60022',
          'letter-spacing': '0.04em',
          transform: 'skewX(-8deg)',
        }}
      >
        ✗︎ SYSTEM CRASH
      </div>
      <div
        style={{
          'font-family': "'Inter', system-ui, sans-serif",
          'font-size': 'clamp(13px, 3.4vw, 16px)',
          opacity: 0.78,
          'max-width': '32em',
          'word-break': 'break-word',
        }}
      >
        {message()}
      </div>
      <button
        type="button"
        onClick={() => {
          props.reset();
          location.reload();
        }}
        style={{
          'font-family': "'Oswald', sans-serif",
          'font-weight': '700',
          'letter-spacing': '0.18em',
          'font-size': '14px',
          padding: '12px 22px',
          color: '#fafaf3',
          background: '#e60022',
          border: '2px solid #fafaf3',
          'box-shadow': '4px 4px 0 #fafaf3',
          'text-transform': 'uppercase',
          cursor: 'pointer',
        }}
      >
        重新连接 // RESTART
      </button>
    </main>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={(err, reset) => <FatalError err={err} reset={reset} />}>
      <MetaProvider>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/room/:code" component={Room} />
          <Route path="*" component={Home} />
        </Router>
      </MetaProvider>
    </ErrorBoundary>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
render(() => <App />, root);
