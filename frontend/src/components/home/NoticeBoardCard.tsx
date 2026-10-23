"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { attendanceApi, OfficeNoticeItem } from '../../services/attendanceApi';

interface NoticeBoardCardProps {
  isAdmin: boolean;
}

export const NoticeBoardCard: React.FC<NoticeBoardCardProps> = ({ isAdmin }) => {
  const [notices, setNotices] = useState<OfficeNoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
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

  return (
    <>
      <div
        className="w-full bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] transition-all flex flex-col shadow-xs"
        style={{
          padding: '20px 24px',
          minHeight: '220px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Notice Board
            </h3>
            {notices.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                {notices.length}
              </span>
            )}
          </div>

          {/* Plus Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-7 h-7 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
              title="Add Notice"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Notices Scrollable Container */}
        <div
          className="flex-1 rounded-xl bg-slate-50/80 dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#334155]/60 p-3 flex flex-col gap-2.5 overflow-y-auto max-h-[185px] scrollbar-thin transition-colors"
          style={{ scrollBehavior: 'smooth' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-xs text-gray-400 dark:text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading notices...
            </div>
          ) : notices.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-gray-400 dark:text-gray-500 font-medium">
              No active announcements posted yet
            </div>
          ) : (
            notices.map((n) => (
              <div
                key={n.id}
                className="bg-white dark:bg-[#162032] rounded-lg p-3.5 border border-slate-200/90 dark:border-[#334155] shadow-2xs hover:border-[#31719B]/40 dark:hover:border-[#31719B]/50 flex items-start justify-between gap-3 group transition-all"
              >
                <div className="flex-1 min-w-0 flex flex-col">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {n.title}
                  </h4>
                  <p className="text-[12px] text-gray-600 dark:text-gray-300 leading-relaxed mt-1 break-words line-clamp-3">
                    {n.body}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-gray-400 dark:text-gray-400 mt-2 pt-1.5 border-t border-gray-100 dark:border-[#334155]/50">
                    <span>
                      Posted by <strong className="font-medium text-gray-500 dark:text-gray-300">{n.createdBy?.name || 'Admin'}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      {new Date(n.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteNotice(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                    title="Delete notice"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col animate-in fade-in zoom-in-95 duration-150"
            style={{ padding: '24px', gap: '16px' }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                New Office Notice
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateNotice} className="flex flex-col" style={{ gap: '14px' }}>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Office Holiday Notice"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Announcement Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter notice content..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 focus:outline-hidden focus:border-purple-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end" style={{ gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
