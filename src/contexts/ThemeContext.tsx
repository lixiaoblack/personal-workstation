/**
 * 主题上下文
 * 管理应用的主题状态，支持深色/浅色/跟随系统三种模式
 */
import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { ThemeMode, ResolvedTheme, ThemeContextValue } from './theme.types';
import { THEME_STORAGE_KEY } from './theme.types';

// 创建上下文
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// 获取系统主题
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// 获取存储的主题
const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
};

// 计算实际主题
const resolveTheme = (theme: ThemeMode): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

// 应用主题到 DOM
const applyTheme = (resolvedTheme: ResolvedTheme): void => {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolvedTheme);
  
  // 同时设置 class 以兼容 Tailwind 的 dark: 前缀
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
}

/**
 * 主题提供者组件
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme,
}) => {
  // 初始化状态
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return defaultTheme || getStoredTheme();
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveTheme(defaultTheme || getStoredTheme());
  });

  // 设置主题
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    // 添加监听器
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);

  // 初始化时应用主题
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const contextValue: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
