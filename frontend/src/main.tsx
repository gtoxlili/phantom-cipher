/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { MetaProvider } from '@solidjs/meta';
import { lazy, Suspense } from 'solid-js';

import 'styled-system/styles.css';
import './styles/global.css';

const Home = lazy(() => import('./routes/Home'));
const Room = lazy(() => import('./routes/Room'));

function App() {
  return (
    <MetaProvider>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/room/:code" component={Room} />
        <Route path="*" component={Home} />
      </Router>
    </MetaProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
render(() => <App />, root);
