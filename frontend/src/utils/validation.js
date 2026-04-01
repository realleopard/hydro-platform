/**
 * 表单验证工具函数
 */

/**
 * 验证必填字段
 * @param {any} value - 字段值
 * @returns {string|null} 错误信息或null
 */
export const validateRequired = (value) => {
  if (value === null || value === undefined || value === '') {
    return '此字段不能为空';
  }
  return null;
};

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {string|null} 错误信息或null
 */
export const validateEmail = (email) => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '请输入有效的邮箱地址';
  }
  return null;
};

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {string|null} 错误信息或null
 */
export const validatePassword = (password) => {
  if (!password) return null;
  if (password.length < 8) {
    return '密码长度至少为8位';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return '密码必须包含至少一个字母';
  }
  if (!/\d/.test(password)) {
    return '密码必须包含至少一个数字';
  }
  return null;
};

/**
 * 验证是否为数字
 * @param {string} value - 输入值
 * @returns {string|null} 错误信息或null
 */
export const validateNumber = (value) => {
  if (!value) return null;
  if (isNaN(Number(value))) {
    return '请输入有效的数字';
  }
  return null;
};

/**
 * 验证数值范围
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {string|null} 错误信息或null
 */
export const validateRange = (value, min, max) => {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  if (min !== undefined && num < min) {
    return `值不能小于 ${min}`;
  }
  if (max !== undefined && num > max) {
    return `值不能大于 ${max}`;
  }
  return null;
};

/**
 * 验证表单
 * @param {Object} values - 表单值
 * @param {Object} rules - 验证规则
 * @returns {Object} 错误对象
 */
export const validateForm = (values, rules) => {
  const errors = {};

  for (const field in rules) {
    const value = values[field];
    const fieldRules = rules[field];

    for (const rule of fieldRules) {
      let error = null;

      switch (rule.type) {
        case 'required':
          error = validateRequired(value);
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        case 'number':
          error = validateNumber(value);
          break;
        case 'range':
          error = validateRange(value, rule.min, rule.max);
          break;
        case 'custom':
          if (rule.validator) {
            error = rule.validator(value, values);
          }
          break;
        default:
          break;
      }

      if (error) {
        errors[field] = error;
        break;
      }
    }
  }

  return errors;
};

export default {
  validateRequired,
  validateEmail,
  validatePassword,
  validateNumber,
  validateRange,
  validateForm
};
