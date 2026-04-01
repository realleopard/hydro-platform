import {
  validateRequired,
  validateEmail,
  validatePassword,
  validateNumber,
  validateRange
} from '../validation';

describe('Validation Utils', () => {
  describe('validateRequired', () => {
    it('should return error for empty string', () => {
      expect(validateRequired('')).toBe('此字段不能为空');
    });

    it('should return error for null', () => {
      expect(validateRequired(null)).toBe('此字段不能为空');
    });

    it('should return error for undefined', () => {
      expect(validateRequired(undefined)).toBe('此字段不能为空');
    });

    it('should return null for valid value', () => {
      expect(validateRequired('test')).toBeNull();
    });

    it('should return null for number 0', () => {
      expect(validateRequired(0)).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('should return error for invalid email', () => {
      expect(validateEmail('invalid')).toBe('请输入有效的邮箱地址');
      expect(validateEmail('test@')).toBe('请输入有效的邮箱地址');
      expect(validateEmail('@example.com')).toBe('请输入有效的邮箱地址');
    });

    it('should return null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
      expect(validateEmail('user.name@example.co.uk')).toBeNull();
    });

    it('should return null for empty email', () => {
      expect(validateEmail('')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return error for short password', () => {
      expect(validatePassword('12345')).toBe('密码长度至少为8位');
    });

    it('should return error for password without letter', () => {
      expect(validatePassword('12345678')).toBe('密码必须包含至少一个字母');
    });

    it('should return error for password without number', () => {
      expect(validatePassword('abcdefgh')).toBe('密码必须包含至少一个数字');
    });

    it('should return null for valid password', () => {
      expect(validatePassword('password123')).toBeNull();
    });
  });

  describe('validateNumber', () => {
    it('should return error for non-number string', () => {
      expect(validateNumber('abc')).toBe('请输入有效的数字');
    });

    it('should return null for valid number', () => {
      expect(validateNumber('123')).toBeNull();
      expect(validateNumber('123.45')).toBeNull();
    });

    it('should return null for empty value', () => {
      expect(validateNumber('')).toBeNull();
    });
  });

  describe('validateRange', () => {
    it('should return error for value below min', () => {
      expect(validateRange(5, 10, 100)).toBe('值不能小于 10');
    });

    it('should return error for value above max', () => {
      expect(validateRange(150, 10, 100)).toBe('值不能大于 100');
    });

    it('should return null for value within range', () => {
      expect(validateRange(50, 10, 100)).toBeNull();
    });

    it('should return null for empty value', () => {
      expect(validateRange('', 10, 100)).toBeNull();
    });
  });
});
