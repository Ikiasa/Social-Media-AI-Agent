import React from 'react';

export type PipelineStep = 1 | 2 | 3 | 4 | 5;

interface GuidedPipelineStepperProps {
  currentStep: PipelineStep;
  onStepClick?: (step: PipelineStep) => void;
}

export const GuidedPipelineStepper: React.FC<GuidedPipelineStepperProps> = ({
  currentStep,
  onStepClick,
}) => {
  const steps = [
    {
      number: 1 as PipelineStep,
      title: '1. Riset & Scraping Data',
      subtitle: 'URL / Handle / Hashtag',
    },
    {
      number: 2 as PipelineStep,
      title: '2. Sentimen & Pain Points',
      subtitle: 'Analisis Radit AI',
    },
    {
      number: 3 as PipelineStep,
      title: '3. Formulasi Draf Konten',
      subtitle: 'AI Tactician Generator',
    },
    {
      number: 4 as PipelineStep,
      title: '4. Persetujuan HITL',
      subtitle: 'Review & Edit Human',
    },
    {
      number: 5 as PipelineStep,
      title: '5. Schedule & Publish',
      subtitle: 'Antrean Kalender',
    },
  ];

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs w-full text-[#0f172a] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#2563eb] animate-pulse"></span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#64748b]">
            Guided Workflow Pipeline
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-[#2563eb] bg-[#eff6ff] px-3 py-1 rounded-full border border-[#bfdbfe]">
          Langkah {currentStep} dari 5
        </span>
      </div>

      {/* Stepper Container with DOM Stitch Connectors */}
      <div className="relative">
        {/* DOM Stitch Progress Line Behind Step Nodes */}
        <div className="hidden sm:block absolute top-6 left-8 right-8 h-0.5 z-0">
          {/* Base Inactive Dashed Stitch Line */}
          <div className="w-full h-full border-t-2 border-dashed border-[#cbd5e1]"></div>
          {/* Active Glowing Progress Stitch Line */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#2563eb] via-[#0284c7] to-[#059669] transition-all duration-500 shadow-xs"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          ></div>
        </div>

        {/* Step Nodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
          {steps.map((step) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="relative flex flex-col items-center sm:items-stretch">
                {/* Node Container Button */}
                <button
                  onClick={() => onStepClick && onStepClick(step.number)}
                  className={`w-full p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between group ${
                    isActive
                      ? 'bg-[#f8fafc] border-[#0f172a] shadow-xs ring-1 ring-[#0f172a]/20'
                      : isCompleted
                      ? 'bg-[#ecfdf5]/50 border-[#a7f3d0] hover:border-[#059669]'
                      : 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    {/* Circle Node Marker */}
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-[#0f172a] text-white shadow-xs scale-105'
                          : isCompleted
                          ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                          : 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]'
                      }`}
                    >
                      {isCompleted ? '✓' : step.number}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                        isActive
                          ? 'bg-[#0f172a] text-white'
                          : isCompleted
                          ? 'bg-[#ecfdf5] text-[#059669]'
                          : 'bg-[#f1f5f9] text-[#64748b]'
                      }`}
                    >
                      {isActive ? 'Aktif' : isCompleted ? 'Selesai' : 'Pending'}
                    </span>
                  </div>

                  <div>
                    <h4
                      className={`text-xs font-bold leading-snug transition-colors ${
                        isActive ? 'text-[#0f172a]' : 'text-[#334155] group-hover:text-[#0f172a]'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-1">{step.subtitle}</p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
