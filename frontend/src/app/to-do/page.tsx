"use client";

import React from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { AdminWelcomeTodoCard } from '@/components/home/AdminWelcomeTodoCard';

export default function ToDoPage() {
  const { currentUser } = useAuth();

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] bg-[#f8fafc] dark:bg-[#0f172a] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <AdminWelcomeTodoCard userName={currentUser?.name || 'User'} />
      </div>
    </div>
  );
}
