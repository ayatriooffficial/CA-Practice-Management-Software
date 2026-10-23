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
        className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition-all flex flex-col"
        style={{
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          minHeight: '220px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Notice Board
          </h3>

          {/* Plus Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-6 h-6 rounded border border-purple-300 dark:border-purple-700 flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
              title="Add Notice"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Lavender Container */}
        <div
          className="flex-1 rounded-xl flex flex-col justify-center transition-all overflow-y-auto"
          style={{
            backgroundColor: '#f3effc', // Sampled lavender from screenshot
            padding: notices.length > 0 ? '16px' : '32px',
            minHeight: '130px',
            maxHeight: '180px',
            gap: '12px',
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading notices...
            </div>
          ) : notices.length === 0 ? (
            <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 font-medium">
              No notices available
            </div>
          ) : (
            notices.map((n) => (
              <div
                key={n.id}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 border border-purple-100 dark:border-purple-900/40 flex items-start justify-between group transition-all"
                style={{ gap: '12px' }}
              >
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    {n.title}
                  </h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                    {n.body}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-1">
                    Posted by {n.createdBy?.name || 'Admin'} •{' '}
                    {new Date(n.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteNotice(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-1"
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
