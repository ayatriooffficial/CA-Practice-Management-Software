"use client";

import React from 'react';
import { User } from '../auth/authTypes';

interface ProfileBannerProps {
  user: User;
}

export const ProfileBanner: React.FC<ProfileBannerProps> = ({ user }) => {
  return (
    <div className="w-full rounded-xl flex items-center border border-[#ede4f7] dark:border-[#334155] bg-[#faf6fd] dark:bg-[#1e293b] px-6 py-4 shadow-2xs transition-colors">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        Welcome {user.name}
      </h2>
    </div>
  );
};
