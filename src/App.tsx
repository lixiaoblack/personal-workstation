/**
 * 应用入口组件
 * 配置主题提供者、认证提供者和路由
 */
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import { ThemeProvider, AuthProvider, useTheme } from "@/contexts";
import { getAntdTheme } from "@/styles/themes/antd-theme";
import router from "@/router";

/**
 * 主题包装组件
 * 根据当前主题动态配置 Ant Design
 */
const ThemeWrapper: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const antdTheme = getAntdTheme(resolvedTheme);

  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
};

/**
 * 应用根组件
 */
function App() {
  // 监听主进程的导航消息
  useEffect(() => {
    const handleNavigate = (_event: unknown, route: string) => {
      console.log(`[App] 收到导航消息: ${route}`);
      // 使用 hash 导航
      window.location.hash = route;
    };

    window.electronAPI?.onNavigate?.(handleNavigate);

    return () => {
      window.electronAPI?.removeNavigateListener?.(handleNavigate);
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeWrapper />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
