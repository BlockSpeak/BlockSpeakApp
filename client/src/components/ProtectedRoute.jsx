import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ account, children }) {
  if (account === null) {
    // Still checking or logging in — show loader or nothing yet
    return null;
  }

  if (!account) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
