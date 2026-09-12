import React, { useState } from 'react';

interface ExecutionsViewProps {
  executions: any[];
  onRefresh: () => void;
}

export const ExecutionsView: React.FC<ExecutionsViewProps> = ({ executions, onRefresh }) => {
  const [selectedExec, setSelectedExec] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Agent Execution History</h1>
          <p className="text-xs text-gray-500 mt-1">
            Audit log trace of all agent execution runs, intents, plans, tool calls, and output results.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all"
        >
          ↻ Refresh Traces
        </button>
      </div>

      {/* Grid: Left List | Right Detail - Flexible Adaptive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* List */}
        <div className="lg:col-span-12 xl:col-span-4 bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs hover:border-[#cbd5e1] transition-all duration-200 space-y-3 max-h-[600px] overflow-y-auto w-full min-w-0">
          {executions.length === 0 ? (
            <div className="text-center py-12 text-[#64748b] text-xs">
              No agent execution traces recorded in workspace.
            </div>
          ) : (
            executions.map((exec) => (
              <div
                key={exec._id || exec.executionId}
                onClick={() => setSelectedExec(exec)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all text-xs space-y-1.5 ${
                  selectedExec?.executionId === exec.executionId
                    ? 'bg-[#eff6ff] border-[#2563eb] shadow-xs'
                    : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[#2563eb] font-bold">{exec.executionId}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      exec.status === 'SUCCESS' || exec.status === 'COMPLETED'
                        ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                        : exec.status === 'WAITING_APPROVAL'
                        ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                        : 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]'
                    }`}
                  >
                    {exec.status}
                  </span>
                </div>

                <div className="text-[#0f172a] font-semibold line-clamp-1">
                  {exec.input?.message || 'Agent Request'}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748b] font-mono pt-1">
                  <span>Intent: {exec.result?.intent || 'GENERAL'}</span>
                  <span>{exec.durationMs}ms</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-12 xl:col-span-8 bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs hover:border-[#cbd5e1] transition-all duration-200 space-y-4 text-xs w-full min-w-0">
          {!selectedExec ? (
            <div className="text-center py-24 text-gray-400 text-xs">
              Select an execution trace from the list to inspect plan steps, tool calls, and result payload.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Execution Audit Trace</h3>
                  <div className="text-gray-500 font-mono text-[11px] mt-0.5">{selectedExec.executionId}</div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedExec.status === 'SUCCESS' || selectedExec.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {selectedExec.status}
                </span>
              </div>

              <div>
                <div className="text-gray-400 font-bold uppercase text-[10px] mb-1">User Message</div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800">
                  {selectedExec.input?.message}
                </div>
              </div>

              <div>
                <div className="text-gray-400 font-bold uppercase text-[10px] mb-1">Tools Executed</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedExec.toolsUsed?.map((t: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-blue-600 font-mono rounded-md font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-gray-400 font-bold uppercase text-[10px] mb-1">Execution Plan</div>
                <pre className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 font-mono overflow-x-auto text-[11px]">
                  {selectedExec.plan}
                </pre>
              </div>

              <div>
                <div className="text-gray-400 font-bold uppercase text-[10px] mb-1">Result Summary</div>
                <pre className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 font-mono overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedExec.result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
