import React from 'react';

export const AgencyOperationsView: React.FC = () => {
  const teamMembers = [
    { name: 'Sarah Strategist', role: 'Strategist', capacityHours: 40, plannedHours: 34, utilization: 85, status: 'HIGH_LOAD' },
    { name: 'Alex Designer', role: 'Designer', capacityHours: 40, plannedHours: 38, utilization: 95, status: 'OVER_CAPACITY' },
    { name: 'David Editor', role: 'Video Editor', capacityHours: 40, plannedHours: 28, utilization: 70, status: 'OPTIMAL' },
    { name: 'Maya Community', role: 'Community Manager', capacityHours: 40, plannedHours: 22, utilization: 55, status: 'OPTIMAL' },
  ];

  const slaEvents = [
    { target: 'Community Inbox Response', metric: '< 15 mins', status: 'MET', actual: '8 mins avg' },
    { target: 'Strategist Approval Review', metric: '< 2 hours', status: 'AT_RISK', actual: '1 hr 50 mins' },
    { target: 'Creative Task Execution', metric: '< 24 hours', status: 'MET', actual: '18 hours avg' },
    { target: 'Publish Reliability', metric: '100% success', status: 'MET', actual: '100%' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agency Operations & SLA Health</h1>
        <p className="text-sm text-slate-500">Monitor team capacity utilization, SLA thresholds, workload distribution, and client service metrics.</p>
      </div>

      {/* SLA Health Monitor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {slaEvents.map((sla) => (
          <div key={sla.target} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 uppercase">{sla.target}</span>
              {sla.status === 'MET' && <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>}
              {sla.status === 'AT_RISK' && <span className="material-symbols-outlined text-base text-amber-500">warning</span>}
              {sla.status === 'BREACHED' && <span className="material-symbols-outlined text-base text-red-500">cancel</span>}
            </div>
            <div className="text-lg font-bold text-slate-800">{sla.actual}</div>
            <div className="text-xs text-slate-400">Target: {sla.metric}</div>
          </div>
        ))}
      </div>

      {/* Team Capacity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-indigo-600">group</span>
          <span>Team Capacity & Utilization Planning</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Team Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Planned Workload</th>
                <th className="py-3 px-4">Utilization</th>
                <th className="py-3 px-4">Capacity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMembers.map((m) => (
                <tr key={m.name} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-semibold text-slate-800">{m.name}</td>
                  <td className="py-3 px-4">{m.role}</td>
                  <td className="py-3 px-4">{m.plannedHours}h / {m.capacityHours}h</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            m.utilization >= 90 ? 'bg-red-500' : m.utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${m.utilization}%` }}
                        />
                      </div>
                      <span className="font-medium text-xs text-slate-700">{m.utilization}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {m.status === 'OVER_CAPACITY' && (
                      <span className="bg-red-100 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        Over Capacity
                      </span>
                    )}
                    {m.status === 'HIGH_LOAD' && (
                      <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        High Load
                      </span>
                    )}
                    {m.status === 'OPTIMAL' && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        Optimal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
