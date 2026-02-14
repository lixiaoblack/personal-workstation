/**
 * 应用入口组件
 * 配置主题提供者和路由
 */
import { RouterProvider } from "react-router-dom";
import { ConfigProvider } from "antd";
import { ThemeProvider, useTheme } from "@/contexts";
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
      <RouterProvider router={router} />
    </ConfigProvider>
  );
};

/**
 * 应用根组件
 */
function App() {
  return (
    <ThemeProvider>
      <ThemeWrapper />
    </ThemeProvider>
  );
}

export default App;
