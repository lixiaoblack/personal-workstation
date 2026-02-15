/**
 * ForgotPassword 忘记密码页面
 * 支持用户通过用户名重置密码
 */
import React, { useState } from "react";
import { Form, Input, Button, message, Steps } from "antd";
import {
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { WAuthLayout } from "@/components/WAuthLayout";
import { useAuth } from "@/contexts";
import { forgotPasswordConfig } from "./config";

interface ForgotPasswordFormValues {
  username: string;
  newPassword: string;
  confirmPassword: string;
}

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { resetPassword, checkUsername } = useAuth();
  const [form] = Form.useForm<ForgotPasswordFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [verifiedUsername, setVerifiedUsername] = useState("");

  // 验证用户名是否存在
  const handleVerifyUsername = async () => {
    try {
      const username = form.getFieldValue("username");
      if (!username) {
        message.warning("请输入用户名");
        return;
      }

      setSubmitting(true);
      const exists = await checkUsername(username);

      if (exists) {
        setVerifiedUsername(username);
        setCurrentStep(1);
        message.success("用户名验证通过");
      } else {
        message.error("用户名不存在");
      }
    } catch {
      message.error("验证失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (values: ForgotPasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const result = await resetPassword({
        username: verifiedUsername,
        newPassword: values.newPassword,
      });

      if (result.success) {
        setCurrentStep(2);
        message.success("密码重置成功");
      } else {
        message.error(result.error || "密码重置失败");
      }
    } catch {
      message.error("密码重置过程中发生错误");
    } finally {
      setSubmitting(false);
    }
  };

  // 返回登录
  const handleBackToLogin = () => {
    navigate("/login");
  };

  // 重新开始
  const handleRestart = () => {
    setCurrentStep(0);
    setVerifiedUsername("");
    form.resetFields();
  };

  // 步骤配置
  const steps = [
    {
      title: "验证用户名",
      icon: <UserOutlined />,
    },
    {
      title: "设置新密码",
      icon: <LockOutlined />,
    },
    {
      title: "完成",
      icon: <CheckCircleOutlined />,
    },
  ];

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form form={form} layout="vertical" autoComplete="off">
            <Form.Item
              name="username"
              rules={forgotPasswordConfig.form.username.rules}
            >
              <Input
                prefix={<UserOutlined className="text-text-tertiary" />}
                placeholder={forgotPasswordConfig.form.username.placeholder}
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                size="large"
                block
                loading={submitting}
                onClick={handleVerifyUsername}
              >
                验证用户名
              </Button>
            </Form.Item>

            <Form.Item>
              <div className="text-center">
                <a
                  onClick={handleBackToLogin}
                  className="text-primary hover:text-primary/80"
                >
                  返回登录
                </a>
              </div>
            </Form.Item>
          </Form>
        );

      case 1:
        return (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleResetPassword}
            autoComplete="off"
          >
            <div className="mb-4 p-3 bg-primary/10 rounded-lg text-center">
              <span className="text-text-secondary">用户名: </span>
              <span className="font-medium text-text-primary">
                {verifiedUsername}
              </span>
            </div>

            <Form.Item
              name="newPassword"
              rules={forgotPasswordConfig.form.newPassword.rules}
            >
              <Input.Password
                prefix={<LockOutlined className="text-text-tertiary" />}
                placeholder={forgotPasswordConfig.form.newPassword.placeholder}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "请确认新密码" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("两次输入的密码不一致"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-text-tertiary" />}
                placeholder={
                  forgotPasswordConfig.form.confirmPassword.placeholder
                }
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
                重置密码
              </Button>
            </Form.Item>

            <Form.Item>
              <div className="text-center">
                <a
                  onClick={handleRestart}
                  className="text-primary hover:text-primary/80"
                >
                  重新验证
                </a>
              </div>
            </Form.Item>
          </Form>
        );

      case 2:
        return (
          <div className="text-center py-4">
            <div className="mb-6">
              <CheckCircleOutlined className="text-5xl text-emerald-500" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              密码重置成功
            </h3>
            <p className="text-text-tertiary mb-6">
              您的密码已成功重置，请使用新密码登录
            </p>
            <Button type="primary" size="large" onClick={handleBackToLogin}>
              返回登录
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <WAuthLayout
      title={forgotPasswordConfig.title}
      subtitle={forgotPasswordConfig.subtitle}
    >
      <Steps
        current={currentStep}
        items={steps}
        size="small"
        className="mb-8"
      />
      {renderStepContent()}
    </WAuthLayout>
  );
};

export { ForgotPassword };
export default ForgotPassword;
