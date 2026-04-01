import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Loading from '../Common/Loading';

/**
 * 私有路由组件
 * 需要登录才能访问的路由
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading, fetchCurrentUser } = useAuthStore();
  const location = useLocation();

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, isLoading, fetchCurrentUser]);

  if (isLoading) {
    return <Loading fullscreen tip="正在验证登录状态..." />;
  }

  if (!isAuthenticated) {
    // 重定向到登录页面，并保存当前路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
