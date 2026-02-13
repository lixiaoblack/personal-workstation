import { useState } from 'react';
import { Button, Space, Typography } from 'antd';
import './App.css';

const { Title, Paragraph } = Typography;

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <Space direction="vertical" size="large" style={{ width: '100%', padding: '40px' }}>
        <Title level={1}>Personal Workstation</Title>
        <Paragraph>
          欢迎使用 Personal Workstation - 基于 Electron + React + TypeScript + Ant Design 构建的桌面应用
        </Paragraph>
        <Space>
          <Button type="primary" onClick={() => setCount((count) => count + 1)}>
            点击次数: {count}
          </Button>
        </Space>
      </Space>
    </div>
  );
}

export default App;
