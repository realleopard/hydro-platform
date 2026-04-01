import { useEffect, useCallback } from 'react';

/**
 * 键盘事件钩子
 * @param {string} targetKey - 目标按键
 * @param {function} callback - 回调函数
 */
export const useKeyPress = (targetKey, callback) => {
  const handleKeyPress = useCallback(
    (event) => {
      if (event.key === targetKey) {
        event.preventDefault();
        callback(event);
      }
    },
    [targetKey, callback]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
};

export default useKeyPress;
