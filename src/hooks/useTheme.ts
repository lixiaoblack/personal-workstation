/**
 * 主题 Hook
 * 提供主题状态和切换方法
 */
import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import type { ThemeContextValue } from '@/contexts/theme.types';

/**
 * 获取主题上下文
 * @returns 主题上下文值
 * @throws 如果不在 ThemeProvider 内使用会抛出错误
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default useTheme;
