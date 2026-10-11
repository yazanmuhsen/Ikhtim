import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import QuranReader from './components/QuranReader';
import Footer from './components/Footer';
import CreateKhitmah from './components/CreateKhitmah';
import { manageStorageKey } from './utils/manageToken';
import { getOrCreateDeviceId } from './utils/deviceId';
import confetti from 'canvas-confetti';
import { Sparkles, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function parsePath(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/new') return { name: 'new' };
  const match = path.match(/^\/k\/([^/]+)$/);
  if (match) return { name: 'custom', slug: match[1] };
  return { name: 'home' };
}

function getManageToken(slug) {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('manage');
  if (fromQuery) {
    localStorage.setItem(manageStorageKey(slug), fromQuery);
    return fromQuery;
  }
  return localStorage.getItem(manageStorageKey(slug));
}

function setRobotsNoindex(enabled) {
  let meta = document.querySelector('meta[name="robots"]');
  if (enabled) {
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex');
  } else if (meta) {
    meta.remove();
  }
}

function AppShell({ children, isWsConnected, onGoHome }) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar isWsConnected={isWsConnected} onGoHome={onGoHome} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function KhitmahApp({ route, navigate }) {
  const { t } = useTranslation();
  const isCustom = route.name === 'custom';
  const apiBase = isCustom ? `/api/k/${route.slug}` : '/api/juz';
  const currentSlug = isCustom ? route.slug : null;

  const [activeView, setActiveView] = useState('dashboard');
  const [selectedJuz, setSelectedJuz] = useState(null);

  const [juzList, setJuzList] = useState([]);
  const [counter, setCounter] = useState({
    totalCompleted: 0,
    currentProgress: 0,
    availableCount: 30,
    totalJuz: 30
  });
  const [personName, setPersonName] = useState('');
  const [dedication, setDedication] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [boardLoading, setBoardLoading] = useState(isCustom);

  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [khitmahCelebration, setKhitmahCelebration] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const wsRef = useRef(null);
  const manageToken = isCustom ? getManageToken(route.slug) : null;

  useEffect(() => {
    setActiveView('dashboard');
    setSelectedJuz(null);
    setNotFound(false);
    setPersonName('');
    setDedication('');
    setBoardLoading(isCustom);
  }, [apiBase, isCustom]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const fetchBoardData = useCallback(async () => {
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(`${apiBase}?device_id=${encodeURIComponent(deviceId)}`, {
        headers: {
          'x-device-id': deviceId
        }
      });
      if (res.status === 404 && isCustom) {
        setNotFound(true);
        setBoardLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setNotFound(false);
        setJuzList(data.juzList || []);
        if (data.counter) {
          setCounter(data.counter);
        }
        if (data.cooldown) {
          setCooldownRemaining(data.cooldown.remainingSeconds || 0);
        }
        if (isCustom) {
          setPersonName(data.personName || '');
          setDedication(data.dedication || '');
        }
        setSelectedJuz(prev => {
          if (!prev) return prev;
          const updated = data.juzList?.find(j => j.juz_number === prev.juz_number);
          return updated || prev;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch board data:', err.message);
    } finally {
      setBoardLoading(false);
    }
  }, [apiBase, isCustom]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchBoardData();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchBoardData]);

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    function connectWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'BOARD_UPDATE') {
              const msgSlug = message.data?.slug;
              if (currentSlug) {
                if (msgSlug !== currentSlug) return;
              } else if (msgSlug) {
                return;
              }
              fetchBoardData();
              if (message.data?.action === 'KHITMAH_RESET' || message.data?.khitmahFinished) {
                setKhitmahCelebration(true);
                confetti({
                  particleCount: 200,
                  spread: 100,
                  origin: { y: 0.5 }
                });
              }
            }
          } catch {
            // non-json
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 4000);
        };

        ws.onerror = () => {
          setIsWsConnected(false);
        };
      } catch {
        console.warn('WebSocket init failed, using polling fallback');
      }
    }

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchBoardData, currentSlug]);

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handleReadJuz = async (targetJuz) => {
    const deviceId = getOrCreateDeviceId();

    try {
      const readPath = isCustom
        ? `${apiBase}/juz/${targetJuz.juz_number}/read`
        : `${apiBase}/${targetJuz.juz_number}/read`;
      const res = await fetch(readPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        }
      });
      const data = await res.json();

      if (res.status === 409) {
        await fetchBoardData();
        showToast(data.message || t('alreadyCompletedAlertDesc'), 'warning');
        setActiveView('dashboard');
        return;
      }

      if (res.status === 429) {
        setCooldownRemaining(data.remainingSeconds || 0);
        showToast(data.message || t('cooldownNotice'), 'warning');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'حدث خطأ');
      }

      setCooldownRemaining(data.remainingSeconds || 2700);
      await fetchBoardData();
      showToast(data.message, 'success');

      if (data.khitmahFinished) {
        setKhitmahCelebration(true);
        confetti({
          particleCount: 250,
          spread: 120,
          origin: { y: 0.5 }
        });
      }

      setActiveView('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!manageToken || !currentSlug) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/k/${currentSlug}`, {
        method: 'DELETE',
        headers: {
          'x-manage-token': manageToken
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t('deleteFailed'));
      }
      localStorage.removeItem(manageStorageKey(currentSlug));
      navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const goHome = () => {
    if (route.name !== 'home') {
      navigate('/');
    } else {
      setActiveView('dashboard');
    }
  };

  return (
    <AppShell isWsConnected={isWsConnected} onGoHome={goHome}>
      {toastMessage && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50 animate-bounce-short">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border backdrop-blur-md max-w-md ${
            toastMessage.type === 'error'
              ? 'bg-rose-50/95 dark:bg-rose-950/95 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
              : toastMessage.type === 'warning'
              ? 'bg-amber-50/95 dark:bg-amber-950/95 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700'
              : toastMessage.type === 'success'
              ? 'bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800'
              : 'bg-stone-900/95 text-white border-stone-700'
          }`}>
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            <span>{toastMessage.message}</span>
            <button onClick={() => setToastMessage(null)} className="p-0.5 hover:opacity-70 ms-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {khitmahCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-lg w-full bg-white dark:bg-stone-900 rounded-3xl p-8 text-center border-2 border-gold-400 dark:border-gold-600 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-300 text-stone-900 flex items-center justify-center mx-auto shadow-lg shadow-gold-500/30">
              <Sparkles className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-bold font-arabic text-khitmah-900 dark:text-khitmah-100">
              {t('khitmahCompletedAlertTitle')}
            </h2>

            <p className="text-sm font-arabic text-stone-600 dark:text-stone-300 leading-relaxed">
              {t('khitmahCompletedAlertDesc')}
            </p>

            <button
              onClick={() => {
                setKhitmahCelebration(false);
                setActiveView('dashboard');
              }}
              className="mt-4 px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-khitmah-700 to-khitmah-900 hover:from-khitmah-800 hover:to-black shadow-md transition-all"
            >
              {t('navHome')}
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 text-center space-y-4">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white font-arabic">
              {t('deleteConfirmTitle')}
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 font-arabic leading-relaxed">
              {t('deleteConfirmDesc')}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                {t('cancelBtn')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 shadow-md disabled:opacity-60"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{t('deleteConfirmBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {notFound ? (
        <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center space-y-4">
          <h1 className="text-xl font-extrabold font-arabic text-khitmah-900 dark:text-khitmah-100">
            {t('notFoundTitle')}
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 font-arabic leading-relaxed">
            {t('notFoundDesc')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-khitmah-700 hover:bg-khitmah-800"
          >
            {t('goHome')}
          </button>
        </div>
      ) : boardLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-khitmah-600 animate-spin" />
        </div>
      ) : activeView === 'dashboard' ? (
        <Dashboard
          juzList={juzList}
          counter={counter}
          cooldownRemaining={cooldownRemaining}
          apiBase={apiBase}
          personName={isCustom ? personName : undefined}
          dedication={isCustom ? dedication : undefined}
          showCreateButton={!isCustom}
          onCreateClick={() => navigate('/new')}
          canManage={Boolean(manageToken)}
          onDelete={() => setShowDeleteConfirm(true)}
          onOpenReader={(target) => {
            setSelectedJuz(target);
            setActiveView('reader');
          }}
        />
      ) : (
        <QuranReader
          juz={selectedJuz}
          cooldownRemaining={cooldownRemaining}
          apiBase={apiBase}
          personName={isCustom ? personName : undefined}
          dedication={isCustom ? dedication : undefined}
          onBack={() => setActiveView('dashboard')}
          onReadJuz={handleReadJuz}
        />
      )}
    </AppShell>
  );
}

function CreatePage({ navigate }) {
  return (
    <AppShell isWsConnected={false} onGoHome={() => navigate('/')}>
      <CreateKhitmah
        onGoHome={() => navigate('/')}
        onGoToKhitmah={(slug) => navigate(`/k/${slug}`)}
      />
    </AppShell>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => parsePath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    setRobotsNoindex(route.name === 'custom' || route.name === 'new');
  }, [route]);

  const navigate = (to) => {
    const path = to.split('?')[0];
    window.history.pushState({}, '', to);
    setRoute(parsePath(path));
  };

  return (
    <ThemeProvider>
      {route.name === 'new' ? (
        <CreatePage navigate={navigate} />
      ) : (
        <KhitmahApp key={route.name === 'custom' ? route.slug : 'home'} route={route} navigate={navigate} />
      )}
    </ThemeProvider>
  );
}
