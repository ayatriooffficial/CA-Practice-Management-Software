"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { attendanceApi, OfficeNoticeItem } from '../../services/attendanceApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DiscardConfirmationModal } from '@/components/ui/DiscardConfirmationModal';

interface NoticeBoardCardProps {
  isAdmin: boolean;
}

export const NoticeBoardCard: React.FC<NoticeBoardCardProps> = ({ isAdmin }) => {
  const [notices, setNotices] = useState<OfficeNoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await attendanceApi.getOfficeNotices();
      setNotices(data);
    } catch {
      // Retain existing state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await attendanceApi.createOfficeNotice(title, body);
      setTitle('');
      setBody('');
      setIsModalOpen(false);
      await fetchNotices();
    } catch (err: any) {
      setError(err.message || 'Failed to post notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await attendanceApi.deleteOfficeNotice(id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Ignore
    }
  };

  const defaultMemberNotices = [
    {
      id: 'default-1',
      title: 'Celebration Announcement',
      body: 'Audit & Direct Tax Department',
      memberName: 'Milton',
      tag: '🎂 Birthday',
      initials: 'M',
    },
    {
      id: 'default-2',
      title: 'Work Anniversary Milestone',
      body: 'Direct Tax Section',
      memberName: 'Rajesh Sharma',
      tag: '🎉 3 Years',
      initials: 'RS',
    },
    {
      id: 'default-3',
      title: 'Client Review & Closure',
      body: 'Audit & Assurance Wing',
      memberName: 'Vikram Singhania',
      tag: '⭐ Excellence',
      initials: 'VS',
    },
    {
      id: 'default-4',
      title: 'GST Portal Filing Update',
      body: 'GST Compliance Group',
      memberName: 'Pooja Sharma',
      tag: '📢 Notice',
      initials: 'PS',
    },
    {
      id: 'default-5',
      title: 'Mobile Geo-Attendance Active',
      body: 'Operations Department',
      memberName: 'Deepak Sahani',
      tag: '📍 Announcement',
      initials: 'DS',
    },
    {
      id: 'default-6',
      title: 'Corporate Advisory Brief',
      body: 'Advisory & Incorporation',
      memberName: 'Ananya Devi Iyer',
      tag: '🌟 Welcome',
      initials: 'AI',
    },
  ];

  // Combine fetched notices with default member announcements for rich variety
  const combinedNotices = notices.length > 0
    ? [
        ...notices.map((n, idx) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          memberName: n.createdBy?.name || defaultMemberNotices[idx % defaultMemberNotices.length].memberName,
          tag: '📢 Office Notice',
          initials: (n.createdBy?.name || defaultMemberNotices[idx % defaultMemberNotices.length].memberName).slice(0, 2).toUpperCase(),
        })),
        ...defaultMemberNotices.slice(notices.length),
      ]
    : defaultMemberNotices;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [hasLiked, setHasLiked] = useState<Record<string, boolean>>({});

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, combinedNotices.length - 1)));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < combinedNotices.length - 1 ? prev + 1 : 0));
  };

  const currentNotice = combinedNotices[currentIndex] || combinedNotices[0];

  const toggleLike = (key: string) => {
    setHasLiked((prev) => ({ ...prev, [key]: !prev[key] }));
    setLikesCount((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + (hasLiked[key] ? -1 : 1),
    }));
  };

  return (
    <>
      <div
        className="w-full h-full bg-white dark:bg-[#1e293b] rounded-none border border-[#dde2e8] dark:border-[#334155] transition-all flex flex-col justify-between shadow-xs"
        style={{
          padding: '20px 24px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Notice Board
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#EAF0F6] dark:bg-[#1E3A5F]/50 text-[#3D6A9E] dark:text-[#93c5fd] border border-[#3D6A9E]/30">
              {combinedNotices.length}
            </span>
          </div>

          {/* Plus Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-7 h-7 rounded-full border border-[#3D6A9E]/30 dark:border-[#3D6A9E]/50 bg-white dark:bg-[#162032] flex items-center justify-center text-[#3D6A9E] dark:text-[#93c5fd] hover:bg-[#EAF0F6] dark:hover:bg-[#1E3A5F]/40 transition-colors cursor-pointer shadow-2xs"
              title="Add Notice"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Notices Slide / Card Container */}
        <div className="relative flex-1 rounded-xl bg-[#F4F7FB] dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] p-3.5 flex flex-col justify-between overflow-hidden">
          {/* Main Card Slider with Dual Side Chevrons */}
          <div className="relative flex items-center gap-2.5">
            {/* Left Chevron Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[#3D6A9E] hover:text-[#2A4D73] dark:hover:text-white transition-all cursor-pointer shrink-0 z-10"
              title="Previous notice"
            >
              <span className="text-xs font-bold leading-none -ml-0.5">&lsaquo;</span>
            </button>

            {/* Inner Featured Banner Card */}
            <div className="flex-1 bg-white dark:bg-[#1e293b] rounded-xl overflow-hidden shadow-sm border border-[#dde2e8] dark:border-[#334155] transition-all flex flex-col">
              {/* Top Gradient Header in #3D6A9E palette */}
              <div
                className="h-9 px-3 flex items-center justify-between"
                style={{
                  background: 'linear-gradient(90deg, #3D6A9E 0%, #4D7BAE 50%, #2A4D73 100%)',
                }}
              >
                <div className="flex items-center gap-1.5 text-white">
                  <span className="text-sm">🎂</span>
                  <span className="text-xs font-semibold tracking-wide">
                    {currentNotice.title}
                  </span>
                </div>
              </div>

              {/* Lower Card Content: Avatar + Member Name + Subtext + Badge */}
              <div className="p-3 sm:p-3.5 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#3D6A9E] to-[#60a5fa] p-0.5 shrink-0 shadow-xs">
                      <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        <span>{currentNotice.initials}</span>
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                        {currentNotice.memberName}
                      </span>
                    </div>
                  </div>

                  {/* Right Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#EAF0F6] dark:bg-[#1E3A5F]/50 text-[#3D6A9E] dark:text-[#93c5fd] border border-[#3D6A9E]/30 shrink-0">
                    <span>{currentNotice.tag}</span>
                  </div>
                </div>

                {/* Announcement body text spans full width cleanly */}
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed break-words whitespace-normal">
                  {currentNotice.body}
                </p>
              </div>
            </div>

            {/* Right Chevron Button */}
            <button
              type="button"
              onClick={handleNext}
              className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[#3D6A9E] hover:text-[#2A4D73] dark:hover:text-white transition-all cursor-pointer shrink-0 z-10"
              title="Next notice"
            >
              <span className="text-xs font-bold leading-none -mr-0.5">&rsaquo;</span>
            </button>
          </div>

          {/* Bottom Bar: Thumbs Up (Left) & Trash (Right) */}
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#3D6A9E]/15 dark:border-[#334155]/40">
            <button
              type="button"
              onClick={() => toggleLike(currentNotice.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                hasLiked[currentNotice.id]
                  ? 'bg-[#EAF0F6] dark:bg-[#1E3A5F]/50 text-[#3D6A9E] dark:text-[#93c5fd] border border-[#3D6A9E]/30'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800'
              }`}
              title="React with Thumbs Up"
            >
              <span>👍</span>
              {(likesCount[currentNotice.id] || 0) > 0 && (
                <span className="text-[10px] font-bold">
                  {likesCount[currentNotice.id]}
                </span>
              )}
            </button>

            {isAdmin && notices.some((n) => n.id === currentNotice.id) && (
              <button
                type="button"
                onClick={() => setNoticeToDelete(currentNotice.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-none hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                title="Delete notice"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal for Delete Notice */}
      <DiscardConfirmationModal
        isOpen={Boolean(noticeToDelete)}
        title="Delete Notice?"
        message="Are you sure you want to delete this office notice? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={async () => {
          if (noticeToDelete) {
            await handleDeleteNotice(noticeToDelete);
            setNoticeToDelete(null);
          }
        }}
        onCancel={() => setNoticeToDelete(null)}
      />

      {/* Add Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-none shadow-xl border border-[#dde2e8] dark:border-[#334155] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            style={{ padding: '24px', gap: '16px' }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                New Office Notice
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-none bg-red-50 text-red-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateNotice} className="flex flex-col" style={{ gap: '14px' }}>
              <Input
                label="Title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Office Holiday Notice"
                size="sm"
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Announcement Details <span className="text-red-500 ml-0.5">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter notice content..."
                  className="w-full px-3 py-2 text-xs rounded-sm border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-hidden focus:border-[#31719B] resize-none"
                />
              </div>

              <div className="flex items-center justify-end" style={{ gap: '10px' }}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isSubmitting}
                >
                  Publish Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
