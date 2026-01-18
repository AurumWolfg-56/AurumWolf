
import React, { useState } from 'react';
import { X, Search, Check, Info } from 'lucide-react';
import { MetricDefinition } from '../lib/business/types';

interface MetricSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    metrics: MetricDefinition[];
    activeMetricIds: string[];
    onToggle: (metricId: string) => void;
}

export const MetricSelectionModal: React.FC<MetricSelectionModalProps> = ({
    isOpen,
    onClose,
    metrics,
    activeMetricIds,
    onToggle
}) => {
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filteredMetrics = metrics.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-zoom-in">

                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">Select KPI Metrics</h3>
                        <p className="text-neutral-500 text-sm">Choose the metrics you want to track for this business.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-neutral-800 bg-neutral-950/50">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search metrics..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:border-gold-500 outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredMetrics.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500">
                            <p>No metrics found matching "{search}"</p>
                        </div>
                    ) : (
                        filteredMetrics.map(metric => {
                            const isActive = activeMetricIds.includes(metric.id);
                            return (
                                <button
                                    key={metric.id}
                                    onClick={() => onToggle(metric.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 group ${isActive
                                            ? 'bg-gold-500/10 border-gold-500/50'
                                            : 'bg-neutral-950/50 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700'
                                        }`}
                                >
                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isActive ? 'bg-gold-500 border-gold-500 text-neutral-950' : 'border-neutral-600 group-hover:border-neutral-400'
                                        }`}>
                                        {isActive && <Check size={14} strokeWidth={3} />}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-sm font-bold ${isActive ? 'text-gold-500' : 'text-neutral-200'}`}>
                                            {metric.name}
                                        </h4>
                                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                                            {metric.description || "Track the performance of this specific metric."}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-400 uppercase tracking-wider">
                                                {metric.type}
                                            </span>
                                            {metric.is_calculated && (
                                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-500/20">
                                                    Auto-Calculated
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-white text-neutral-950 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
