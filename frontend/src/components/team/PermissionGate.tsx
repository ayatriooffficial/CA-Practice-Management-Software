'use client';

import React from 'react';
import { usePermission, PermissionAction } from './usePermission';
import { AccessDenied } from './AccessDenied';

interface PermissionGateProps {
  module: string;
  action?: PermissionAction;
  fallback?: React.ReactNode;
  isPageLevel?: boolean;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action = 'view',
  fallback,
  isPageLevel = false,
  children,
}) => {
  const { can } = usePermission();
  const hasAccess = can(module, action);

  if (!hasAccess) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    if (isPageLevel) {
      return <AccessDenied moduleName={module} actionName={action} />;
    }
    return null;
  }

  return <>{children}</>;
};
