import React from 'react';

/**
 * 错误边界组件
 * 捕获子组件的错误并显示友好的错误信息
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h2 style={styles.title}>出错了</h2>
            <p style={styles.message}>
              应用程序遇到了一个错误。请尝试刷新页面或联系管理员。
            </p>
            {this.state.error && (
              <details style={styles.details}>
                <summary>查看错误详情</summary>
                <pre style={styles.pre}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button onClick={this.handleReset} style={styles.button}>
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '20px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '600px',
  },
  title: {
    color: '#ff4d4f',
    marginBottom: '16px',
  },
  message: {
    color: '#666',
    marginBottom: '20px',
  },
  details: {
    marginBottom: '20px',
    textAlign: 'left',
    background: '#f5f5f5',
    padding: '16px',
    borderRadius: '4px',
  },
  pre: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '12px',
    color: '#333',
  },
  button: {
    padding: '8px 24px',
    background: '#1890ff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default ErrorBoundary;
