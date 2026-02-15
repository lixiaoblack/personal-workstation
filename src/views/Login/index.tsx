/**
 * Login 登录页面
 * 支持账号密码登录、首次启动注册、忘记密码跳转
 */
import React, { useState, useEffect } from "react";
import { Form, Input, Button, Checkbox, App } from "antd";
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
  const { message } = App.useApp();
  const { login, register, isInitialized, isAuthenticated, isLoading } =
    useAuth();
  const [loginForm] = Form.useForm<LoginFormValues>();
  const [registerForm] = Form.useForm<RegisterFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // 如果已登录，跳转到首页
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // 如果系统未初始化，默认显示注册表单
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      setShowRegister(true);
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

  // 切换登录/注册
  const toggleMode = () => {
    setShowRegister(!showRegister);
    loginForm.resetFields();
    registerForm.resetFields();
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

  // 渲染登录表单
  const renderLoginForm = () => (
    <Form
      form={loginForm}
      layout="vertical"
      onFinish={handleLogin}
      autoComplete="off"
      className="space-y-6"
    >
      {/* 账号 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          账号
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
            person
          </span>
          <Form.Item
            name="username"
            rules={loginConfig.form.username.rules}
            className="mb-0"
          >
            <Input
              className="block w-full pl-11 pr-4 py-3 bg-bg-tertiary border-border text-text-primary rounded-lg focus:ring-primary focus:border-primary transition-colors"
              placeholder={loginConfig.form.username.placeholder}
            />
          </Form.Item>
        </div>
      </div>

      {/* 密码 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          密码
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
            lock
          </span>
          <Form.Item
            name="password"
            rules={loginConfig.form.password.rules}
            className="mb-0"
          >
            <Input
              type={passwordVisible ? "text" : "password"}
              className="block w-full pl-11 pr-12 py-3 bg-bg-tertiary border-border text-text-primary rounded-lg focus:ring-primary focus:border-primary transition-colors"
              placeholder={loginConfig.form.password.placeholder}
            />
          </Form.Item>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-primary transition-colors"
            onClick={() => setPasswordVisible(!passwordVisible)}
          >
            <span className="material-symbols-outlined text-xl">
              {passwordVisible ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {/* 记住我 & 忘记密码 */}
      <div className="flex items-center justify-between">
        <Form.Item name="remember" valuePropName="checked" className="mb-0">
          <Checkbox className="text-text-secondary text-sm">记住我</Checkbox>
        </Form.Item>
        <a
          onClick={handleForgotPassword}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          忘记密码?
        </a>
      </div>

      {/* 登录按钮 */}
      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={submitting}
          className="h-11 font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          登录
        </Button>
      </Form.Item>
    </Form>
  );

  // 渲染注册表单
  const renderRegisterForm = () => (
    <Form
      form={registerForm}
      layout="vertical"
      onFinish={handleRegister}
      autoComplete="off"
      className="space-y-4"
    >
      <Form.Item
        name="username"
        rules={loginConfig.form.username.rules}
        label={
          <span className="text-sm font-medium text-text-secondary">
            用户名
          </span>
        }
      >
        <Input
          prefix={<UserOutlined className="text-text-tertiary" />}
          placeholder={loginConfig.form.username.placeholder}
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="nickname"
        label={
          <span className="text-sm font-medium text-text-secondary">昵称</span>
        }
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
        label={
          <span className="text-sm font-medium text-text-secondary">密码</span>
        }
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
        label={
          <span className="text-sm font-medium text-text-secondary">
            确认密码
          </span>
        }
      >
        <Input.Password
          prefix={<LockOutlined className="text-text-tertiary" />}
          placeholder="请再次输入密码"
          size="large"
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={submitting}
          className="h-11 font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          注册
        </Button>
      </Form.Item>
    </Form>
  );

  // 渲染其他登录方式
  const renderOtherLoginMethods = () => (
    <>
      {/* 分隔线 */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-bg-secondary px-2 text-text-tertiary">
            其他登录方式
          </span>
        </div>
      </div>

      {/* 其他登录方式按钮 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2 border border-border rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary text-sm"
        >
          <span className="material-symbols-outlined mr-2 text-lg">
            qr_code_scanner
          </span>
          扫码登录
        </button>
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2 border border-border rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary text-sm"
        >
          <span className="material-symbols-outlined mr-2 text-lg">
            fingerprint
          </span>
          指纹登录
        </button>
      </div>
    </>
  );

  return (
    <WAuthLayout
      title={showRegister ? "注册新账号" : "欢迎登录个人工作站"}
      subtitle={
        showRegister
          ? "创建您的账号以开始使用"
          : "请输入您的凭据以访问您的工作站"
      }
      footer={
        showRegister ? (
          <>
            已有账号?{" "}
            <a
              onClick={toggleMode}
              className="text-primary font-medium hover:underline"
            >
              立即登录
            </a>
          </>
        ) : (
          <>
            还没有账号?{" "}
            <a
              onClick={toggleMode}
              className="text-primary font-medium hover:underline"
            >
              立即注册
            </a>
          </>
        )
      }
    >
      {showRegister ? (
        renderRegisterForm()
      ) : (
        <>
          {renderLoginForm()}
          {renderOtherLoginMethods()}
        </>
      )}
    </WAuthLayout>
  );
};

export { Login };
export default Login;
