'use client';

import React from 'react';
import Link from 'next/link';

interface AccessDeniedProps {
  moduleName?: string;
  actionName?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  moduleName = 'this section',
  actionName = 'view',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-sm border border-amber-200">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
      <p className="text-sm text-gray-600 max-w-md mb-6 leading-relaxed">
        You do not have permission to {actionName} {moduleName}. Please contact your practice administrator to request access.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/team"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          View Team
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-white bg-[#3D6A9E] rounded-lg hover:bg-[#3D6A9E] transition-colors shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
