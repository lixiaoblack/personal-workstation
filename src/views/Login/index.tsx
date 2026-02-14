/**
 * Login 登录页面
 * 支持账号密码登录、首次启动注册、忘记密码跳转
 */
import React, { useState, useEffect } from "react";
import { Form, Input, Button, message, Tabs } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { WAuthLayout } from "@/components/WAuthLayout";
import { useAuth } from "@/contexts";
import { loginConfig } from "./config";

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

interface RegisterFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  nickname?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isInitialized, isAuthenticated, isLoading } = useAuth();
  const [loginForm] = Form.useForm<LoginFormValues>();
  const [registerForm] = Form.useForm<RegisterFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // 如果已登录，跳转到首页
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // 如果系统未初始化，默认显示注册标签
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      setActiveTab("register");
    }
  }, [isInitialized, isLoading]);

  // 处理登录
  const handleLogin = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const result = await login({
        username: values.username,
        password: values.password,
        remember: values.remember,
      });

      if (result.success) {
        message.success("登录成功");
        navigate("/", { replace: true });
      } else {
        message.error(result.error || "登录失败");
      }
    } catch {
      message.error("登录过程中发生错误");
    } finally {
      setSubmitting(false);
    }
  };

  // 处理注册
  const handleRegister = async (values: RegisterFormValues) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const result = await register({
        username: values.username,
        password: values.password,
        nickname: values.nickname,
      });

      if (result.success) {
        message.success("注册成功，正在登录...");
        navigate("/", { replace: true });
      } else {
        message.error(result.error || "注册失败");
      }
    } catch {
      message.error("注册过程中发生错误");
    } finally {
      setSubmitting(false);
    }
  };

  // 跳转忘记密码
  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <WAuthLayout title="加载中...">
        <div className="flex items-center justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">
            progress_activity
          </span>
        </div>
      </WAuthLayout>
    );
  }

  const tabItems = [
    {
      key: "login",
      label: "登录",
      children: (
        <Form
          form={loginForm}
          layout="vertical"
          onFinish={handleLogin}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={loginConfig.form.username.rules}
          >
            <Input
              prefix={<UserOutlined className="text-text-tertiary" />}
              placeholder={loginConfig.form.username.placeholder}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={loginConfig.form.password.rules}
          >
            <Input.Password
              prefix={<LockOutlined className="text-text-tertiary" />}
              placeholder={loginConfig.form.password.placeholder}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <div className="flex justify-between items-center">
              <a
                onClick={handleForgotPassword}
                className="text-primary hover:text-primary/80 text-sm"
              >
                忘记密码？
              </a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "register",
      label: "注册",
      children: (
        <Form
          form={registerForm}
          layout="vertical"
          onFinish={handleRegister}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={loginConfig.form.username.rules}
          >
            <Input
              prefix={<UserOutlined className="text-text-tertiary" />}
              placeholder={loginConfig.form.username.placeholder}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="nickname"
          >
            <Input
              prefix={<UserOutlined className="text-text-tertiary" />}
              placeholder="昵称（可选）"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={loginConfig.form.password.rules}
          >
            <Input.Password
              prefix={<LockOutlined className="text-text-tertiary" />}
              placeholder={loginConfig.form.password.placeholder}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请确认密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-text-tertiary" />}
              placeholder="确认密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
            >
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <WAuthLayout
      title={activeTab === "login" ? loginConfig.title : "注册"}
      subtitle={loginConfig.subtitle}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "login" | "register")}
        centered
        items={tabItems}
      />
    </WAuthLayout>
  );
};

export { Login };
export default Login;
