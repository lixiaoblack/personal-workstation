/**
 * 忘记密码页面配置
 */
export const forgotPasswordConfig = {
  // 页面标题
  title: "重置密码",
  subtitle: "输入您的用户名和新密码",
  
  // 表单字段配置
  form: {
    username: {
      label: "用户名",
      placeholder: "请输入用户名",
      rules: [
        { required: true, message: "请输入用户名" },
        { min: 3, max: 20, message: "用户名长度为 3-20 个字符" },
      ],
    },
    newPassword: {
      label: "新密码",
      placeholder: "请输入新密码",
      rules: [
        { required: true, message: "请输入新密码" },
        { min: 6, max: 32, message: "密码长度为 6-32 个字符" },
      ],
    },
    confirmPassword: {
      label: "确认密码",
      placeholder: "请再次输入新密码",
      rules: [
        { required: true, message: "请确认新密码" },
      ],
    },
  },
  
  // 链接
  links: {
    login: "/login",
  },
};

export default forgotPasswordConfig;
