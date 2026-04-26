type ThemeSource = 'system' | 'light' | 'dark';

interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onMaximized: (cb: () => void) => () => void;
    onUnmaximized: (cb: () => void) => () => void;
  };
  theme: {
    get: () => Promise<{ isDark: boolean; source: ThemeSource }>;
    set: (source: ThemeSource) => void;
    onUpdated: (cb: (isDark: boolean) => void) => () => void;
  };
  storage: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

interface Window {
  electron: ElectronAPI;
}
