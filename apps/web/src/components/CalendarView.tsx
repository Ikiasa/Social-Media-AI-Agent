import React, { useState } from 'react';
import { useAuth } from '../lib/auth/AuthContext';

interface CalendarViewProps {
  scheduledPosts: any[];
  contentList: any[];
  onRefresh: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ scheduledPosts, contentList, onRefresh }) => {
  const { api, activeBrandId } = useAuth();
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [selectedContentId, setSelectedContentId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContentId || !scheduledDate) return;

    try {
      const fullIso = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      await api.scheduleContent({
        contentId: selectedContentId,
        scheduledAt: fullIso,
        timezone,
        brandId: activeBrandId,
      });

      onRefresh();
      setShowScheduleModal(false);
      alert('Content scheduled successfully!');
    } catch (err) {
      alert(`Scheduling error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      await api.cancelSchedule(id);
      onRefresh();
      alert('Scheduled post cancelled.');
    } catch (err) {
      alert(`Cancel error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const approvedDrafts = contentList.filter((c) => c.status === 'APPROVED' || c.status === 'DRAFT');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Timezone-Aware Social Calendar</h1>
          <p className="text-xs text-gray-500 mt-1">
            Organize approved content, schedule posting times, and inspect scheduled queues.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                viewMode === 'month' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'
              }`}
            >
              Queue List
            </button>
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-all shadow"
          >
            + Schedule Post
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-500 pb-2 border-b border-gray-100">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 min-h-[350px]">
            {Array.from({ length: 28 }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayPosts = scheduledPosts.filter((p) => new Date(p.scheduledAt).getDate() === dayNum);

              return (
                <div
                  key={idx}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex flex-col justify-between hover:border-gray-300 text-xs"
                >
                  <span className="font-mono text-gray-400 font-bold">{dayNum}</span>
                  <div className="space-y-1 my-1">
                    {dayPosts.map((post) => (
                      <div
                        key={post._id}
                        className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold truncate"
                        title={post.scheduledAt}
                      >
                        {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Post
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Queue List View */
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Scheduled Publishing Queue</h2>
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No posts currently scheduled in active workspace.
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map((item) => (
                <div
                  key={item._id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">Post ID: {String(item.contentId).slice(-6)}</div>
                    <div className="text-gray-500 font-mono text-[11px]">
                      Scheduled: {new Date(item.scheduledAt).toLocaleString()} ({item.timezone || 'UTC'})
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        item.status === 'READY_TO_PUBLISH'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {item.status}
                    </span>
                    <button
                      onClick={() => handleCancelSchedule(item._id)}
                      className="text-rose-600 hover:underline text-xs font-medium"
                    >
                      Cancel Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Schedule Post</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Select Approved Content</label>
                <select
                  value={selectedContentId}
                  onChange={(e) => setSelectedContentId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                  required
                >
                  <option value="">-- Choose Content --</option>
                  {approvedDrafts.map((c) => (
                    <option key={c._id} value={c._id}>
                      [{c.status}] {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Target Publishing Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Target Publishing Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900"
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow"
                >
                  Schedule Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
