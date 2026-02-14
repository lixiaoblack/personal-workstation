/**
 * 登录页面配置
 */
export const loginConfig = {
  // 页面标题
  title: "登录",
  subtitle: "欢迎使用 Personal Workstation",
  
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
    password: {
      label: "密码",
      placeholder: "请输入密码",
      rules: [
        { required: true, message: "请输入密码" },
        { min: 6, max: 32, message: "密码长度为 6-32 个字符" },
      ],
    },
  },
  
  // 其他链接
  links: {
    forgotPassword: "/forgot-password",
    register: "/register",
  },
};

export default loginConfig;
