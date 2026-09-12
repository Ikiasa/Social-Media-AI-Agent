import React, { useState } from 'react';

export const ClientReportView: React.FC = () => {
  const [showExportModal, setShowExportModal] = useState(false);

  const report = {
    title: 'Monthly Campaign Performance & Operations Report',
    brandName: 'Acme Tech Brand',
    period: 'Aug 1, 2026 - Aug 31, 2026',
    status: 'DRAFT',
    whiteLabelConfig: {
      primaryColor: '#4f46e5',
      secondaryColor: '#06b6d4',
      footerText: 'Confidential Report • Generated for Acme Tech Brand',
    },
    sections: [
      {
        title: 'Executive KPI Summary',
        kpis: [
          { label: 'Attributed Conversions', value: '142' },
          { label: 'Attributed Revenue', value: '$24,500' },
          { label: 'Inbound DMs Handled', value: '380' },
          { label: 'SLA Compliance Rate', value: '98.5%' },
        ],
      },
      {
        title: 'Creative Work Delivered',
        summary: '24 Instagram posts, 8 TikTok video reels, and 4 LinkedIn articles published across 4 content pillars.',
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">White-Label Client Report Studio</h1>
          <p className="text-sm text-slate-500">Generate, review, customize, and export agency reports for client presentation.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Export Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Report Preview Document */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header Branding */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Client Performance Report</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">{report.title}</h2>
            <p className="text-sm text-slate-500">{report.brandName} • {report.period}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            A
          </div>
        </div>

        {/* Sections */}
        {report.sections.map((sec, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-l-4 border-indigo-600 pl-3">{sec.title}</h3>
            {sec.kpis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sec.kpis.map((kpi) => (
                  <div key={kpi.label} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">{kpi.label}</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">{kpi.value}</div>
                  </div>
                ))}
              </div>
            )}
            {sec.summary && <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">{sec.summary}</p>}
          </div>
        ))}

        {/* White-label Footer */}
        <div className="border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          {report.whiteLabelConfig.footerText}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Export White-Label Report</h2>
            <p className="text-sm text-slate-600">Generate secure short-lived PDF download link with tenant white-label branding applied.</p>
            <div className="pt-2 flex justify-end space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Export URL generated securely.');
                  setShowExportModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
              >
                Confirm Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
