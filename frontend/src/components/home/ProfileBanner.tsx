"use client";

import React from 'react';
import { User } from '../auth/authTypes';

interface ProfileBannerProps {
  user: User;
}

export const ProfileBanner: React.FC<ProfileBannerProps> = ({ user }) => {
  return (
    <div
      className="w-full rounded-xl flex items-center border transition-all"
      style={{
        backgroundColor: '#faf6fd', // light peach/lavender tint
        borderColor: '#ede4f7',
        padding: '16px 24px',
      }}
    >
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        Welcome {user.name}
      </h2>
    </div>
  );
};
