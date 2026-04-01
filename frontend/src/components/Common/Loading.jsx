import React from 'react';
import { Spin } from 'antd';
import styles from './Loading.module.css';

/**
 * 加载组件
 * @param {Object} props
 * @param {string} props.tip - 加载提示文本
 * @param {string} props.size - 加载图标大小 'small' | 'default' | 'large'
 * @param {boolean} props.fullscreen - 是否全屏显示
 * @param {boolean} props.overlay - 是否显示遮罩层
 */
const Loading = ({ tip = '加载中...', size = 'large', fullscreen = false, overlay = false }) => {
  if (fullscreen) {
    return (
      <div className={styles.fullscreenContainer}>
        <Spin size={size} tip={tip} />
      </div>
    );
  }

  if (overlay) {
    return (
      <div className={styles.overlayContainer}>
        <Spin size={size} tip={tip} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Spin size={size} tip={tip} />
    </div>
  );
};

export default Loading;
