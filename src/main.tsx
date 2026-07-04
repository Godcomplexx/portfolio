import {StrictMode, Suspense, lazy, useEffect, useLayoutEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const ThreeDLabPage = lazy(() => import('./ThreeDLabPage.tsx'));

type Route = 'home' | '3d-lab';

const getRouteFromHash = (): Route => (window.location.hash === '#/3d-lab' ? '3d-lab' : 'home');

function RootRouter() {
  const [route, setRoute] = useState<Route>(getRouteFromHash);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = previous;
      }
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return route === '3d-lab' ? (
    <Suspense fallback={null}>
      <ThreeDLabPage />
    </Suspense>
  ) : (
    <App />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>,
);
