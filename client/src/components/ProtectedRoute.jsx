import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ account, children }) {
  if (!account) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default ProtectedRoute;
