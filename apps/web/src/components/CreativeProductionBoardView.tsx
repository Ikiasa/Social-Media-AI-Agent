import React, { useState } from 'react';

export const CreativeProductionBoardView: React.FC = () => {
  const tasks = [
    {
      id: 'task-101',
      title: 'Hook Copywriting for TikTok AI Campaign',
      taskType: 'copywriting',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignee: 'Sarah Strategist',
      dueAt: '2026-09-14',
      estimatedMinutes: 90,
    },
    {
      id: 'task-102',
      title: 'Design 5 Carousel Banners (1080x1080)',
      taskType: 'design',
      status: 'TODO',
      priority: 'NORMAL',
      assignee: 'Alex Designer',
      dueAt: '2026-09-15',
      estimatedMinutes: 180,
    },
    {
      id: 'task-103',
      title: 'Video Motion Editing & Subtitles',
      taskType: 'video_editing',
      status: 'IN_REVIEW',
      priority: 'URGENT',
      assignee: 'David Editor',
      dueAt: '2026-09-13',
      estimatedMinutes: 240,
    },
    {
      id: 'task-104',
      title: 'Strategy Briefing & Content Pillar Definition',
      taskType: 'strategy',
      status: 'DONE',
      priority: 'NORMAL',
      assignee: 'Sarah Strategist',
      dueAt: '2026-09-11',
      estimatedMinutes: 120,
    },
  ];

  const columns = [
    { key: 'TODO', label: 'To Do', color: 'border-slate-300 bg-slate-50' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-300 bg-blue-50/50' },
    { key: 'IN_REVIEW', label: 'In Review', color: 'border-amber-300 bg-amber-50/50' },
    { key: 'DONE', label: 'Completed', color: 'border-emerald-300 bg-emerald-50/50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Creative Production Board</h1>
          <p className="text-sm text-slate-500">Track briefs, task workflows, team assignments, and production deadlines.</p>
        </div>
        <button className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition">
          <span className="material-symbols-outlined text-base">add</span>
          <span>New Task</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border p-4 ${col.color} min-h-[500px] flex flex-col space-y-4`}>
              <div className="flex justify-between items-center font-bold text-slate-700 text-sm">
                <span>{col.label}</span>
                <span className="bg-white text-slate-600 px-2 py-0.5 rounded-full text-xs border border-slate-200">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-3 flex-1">
                {colTasks.map((t) => (
                  <div key={t.id} className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-3 hover:shadow transition">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {t.taskType}
                      </span>
                      {t.priority === 'URGENT' && (
                        <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span> URGENT
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-slate-800 text-sm leading-snug">{t.title}</h4>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center space-x-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                        <span>{t.assignee}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                        <span>{t.estimatedMinutes}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
