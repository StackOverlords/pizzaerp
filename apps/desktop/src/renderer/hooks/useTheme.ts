import { useEffect, useState } from 'react';

type ThemeSource = 'system' | 'light' | 'dark';

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
}

export function useTheme() {
  const [source, setSource] = useState<ThemeSource>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    window.electron.theme.get().then(({ isDark, source }) => {
      setSource(source);
      setIsDark(isDark);
      applyTheme(isDark);
    });

    const off = window.electron.theme.onUpdated((isDark) => {
      setIsDark(isDark);
      applyTheme(isDark);
    });

    return off;
  }, []);

  const setTheme = (next: ThemeSource) => {
    setSource(next);
    window.electron.theme.set(next);
  };

  return { isDark, source, setTheme };
}
