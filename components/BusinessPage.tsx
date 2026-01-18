
import React, { useState, useMemo } from 'react';
import {
    LayoutGrid, Plus, Globe, Building, MoreHorizontal, Zap, ArrowRight,
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, ChevronLeft,
    Target, Settings, Store, RefreshCw, BarChart3, PieChart, Users, DollarSign, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../contexts/BusinessContext';
import { useTransactions } from '../contexts/TransactionsContext';
import { useAccounts } from '../contexts/AccountsContext';
import { CardVisual } from './AccountsPage';
import { formatCurrency } from '../lib/money';
import { BusinessEntity } from '../types';
import { MetricSelectionModal } from './MetricSelectionModal';

interface BusinessPageProps {
    searchQuery?: string;
    baseCurrency: string;
    t: (key: string) => string;
}

export const BusinessPage: React.FC<BusinessPageProps> = ({ searchQuery = '', baseCurrency, t }) => {
    const { entities, healthScores, addEntity, updateEntity, deleteEntity, metricPacks, metricDefinitions, businessMetrics } = useBusiness();
    const { transactions } = useTransactions();
    const { accounts } = useAccounts();

    // UI State
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Wizard State
    const [wizardName, setWizardName] = useState('');
    const [wizardType, setWizardType] = useState('store');
    const [wizardPack, setWizardPack] = useState('');

    const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);

    // Derived State
    const selectedEntity = useMemo(() =>
        entities.find(e => e.id === selectedEntityId),
        [entities, selectedEntityId]);

    const entityHealth = selectedEntity ? healthScores[selectedEntity.id] : null;
    const entityMetrics = selectedEntity ? businessMetrics[selectedEntity.id] : [];

    // --- HANDLERS ---

    const handleQuickAdd = async () => {
        if (!wizardName) return;
        const entity: BusinessEntity = {
            id: '',
            name: wizardName,
            type: wizardType as any,
        };
        await addEntity(entity, wizardPack);
        setIsWizardOpen(false);
        setWizardName('');
    };

    const handleUpdateTarget = (metricId: string, newVal: string) => {
        if (!selectedEntity) return;
        const numVal = parseFloat(newVal);

        // We update via the entity's customMetricsValues logic we wired in Context
        // But first we need updates to that object structure if it doesn't exist
        const currentValues = selectedEntity.customMetricsValues || {};
        const updatedEntity = {
            ...selectedEntity,
            customMetricsValues: {
                ...currentValues,
                [metricId]: numVal
            }
        };
        updateEntity(updatedEntity);
    };

    const handleToggleMetric = (metricId: string) => {
        if (!selectedEntity) return;
        const currentConfig = selectedEntity.customMetricsConfig || entityMetrics.map(m => m.metric_id);

        // If metric is currently active (exists in metrics list), we remove it?
        // Or if it's in the config list.
        // Simplification: We toggle ID in the config list.

        let newConfig;
        if (currentConfig.includes(metricId)) {
            newConfig = currentConfig.filter(id => id !== metricId);
        } else {
            newConfig = [...currentConfig, metricId];
        }

        updateEntity({
            ...selectedEntity,
            customMetricsConfig: newConfig
        });
    }

    const handleDelete = async () => {
        if (!selectedEntity) return;
        if (confirm(`Are you sure you want to delete ${selectedEntity.name}? This cannot be undone and will delete specific metrics.`)) {
            await deleteEntity(selectedEntity.id);
            setSelectedEntityId(null);
        }
    };

    // --- DETAIL VIEW RENDER ---
    if (selectedEntity) {
        // Filter transactions for this entity for the "Ledger"
        const entityTxs = transactions.filter(t => t.business_id === selectedEntity.id);
        const revenue = entityTxs.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.numericAmount, 0);
        const expenses = entityTxs.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.numericAmount, 0);
        const profit = revenue - expenses;

        return (
            <div className="animate-fade-in space-y-6 pb-20 md:pb-0">
                {/* Back & Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedEntityId(null)}
                        className="p-2 rounded-full bg-platinum-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            {selectedEntity.name}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 uppercase tracking-wider">
                            <span className="bg-platinum-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400">{selectedEntity.type}</span>
                            <span>•</span>
                            <span className={entityHealth?.status === 'critical' ? 'text-red-500 font-bold' : entityHealth?.status === 'at_risk' ? 'text-orange-500 font-bold' : 'text-green-500 font-bold'}>
                                Health Score: {entityHealth?.overall_score || 0}/100
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold text-xs transition-colors"
                    >
                        Delete Entity
                    </button>
                </div>

                {/* Diagnosis Panel */}
                <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-3">
                        <Activity size={16} className="text-gold-500" /> AI Diagnosis
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
                        {entityHealth?.diagnosis?.summary || "Insufficient data for detailed diagnosis."}
                    </p>
                </div>

                {/* Financial Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 shadow-sm">
                        <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Revenue</p>
                        <p className="text-2xl font-mono font-bold text-neutral-900 dark:text-white">{formatCurrency(revenue, baseCurrency)}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 shadow-sm">
                        <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Expenses</p>
                        <p className="text-2xl font-mono font-bold text-neutral-900 dark:text-white">{formatCurrency(expenses, baseCurrency)}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 shadow-sm">
                        <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Net Profit</p>
                        <p className={`text-2xl font-mono font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(profit, baseCurrency)}</p>
                    </div>
                </div>

                {/* Targets Configuration */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Target size={16} className="text-gold-500" /> KPI Goals & Targets
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {entityMetrics?.map(metric => {
                            const def = metricDefinitions.find(d => d.id === metric.metric_id);
                            return (
                                <div key={metric.id} className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 flex flex-col gap-3 group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-bold text-neutral-900 dark:text-white">{def?.name || metric.metric_id.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] text-neutral-500 uppercase">{def?.format === 'currency' ? 'Currency Goal' : 'Percentage Goal'}</p>
                                        </div>
                                        <div className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-bold text-neutral-500">
                                            Current: {metricDefinitions.find(d => d.id === metric.metric_id)?.format === 'currency' ? '$' : ''}{Math.round(0 /* Placeholder for actual current val without recalculating entire array here */)}{metricDefinitions.find(d => d.id === metric.metric_id)?.format === 'currency' ? '' : '%'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-platinum-50 dark:bg-neutral-950 p-2 rounded-xl border border-platinum-200 dark:border-neutral-800 focus-within:border-gold-500 transition-colors">
                                        <span className="text-xs text-neutral-500 font-bold uppercase">Target:</span>
                                        <input
                                            type="number"
                                            defaultValue={metric.target_value}
                                            onBlur={(e) => handleUpdateTarget(metric.metric_id, e.target.value)}
                                            className="bg-transparent w-full outline-none text-sm font-mono font-bold text-neutral-900 dark:text-white"
                                            placeholder="Set Goal..."
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add New Metric Placeholder */}
                        <div
                            onClick={() => setIsMetricModalOpen(true)}
                            className="p-4 rounded-2xl bg-platinum-50 dark:bg-neutral-900/50 border border-dashed border-platinum-300 dark:border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-gold-500 hover:border-gold-500 transition-all cursor-pointer opacity-50 hover:opacity-100"
                            title="Manage Metrics"
                        >
                            <span className="text-xs font-bold flex items-center gap-2"><Plus size={14} /> Add Metric Target</span>
                        </div>
                    </div>
                </div>

                {/* Metric Selection Modal */}
                <MetricSelectionModal
                    isOpen={isMetricModalOpen}
                    onClose={() => setIsMetricModalOpen(false)}
                    metrics={metricDefinitions}
                    activeMetricIds={selectedEntity.customMetricsConfig || entityMetrics.map(m => m.metric_id)}
                    onToggle={handleToggleMetric}
                />

                {/* Transactions Ledger (Mini) */}
                <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl overflow-hidden mt-6">
                    <div className="p-4 border-b border-platinum-200 dark:border-neutral-800 bg-platinum-50 dark:bg-neutral-950/30">
                        <p className="text-xs font-bold text-neutral-500 uppercase">Recent Activity</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {entityTxs.length === 0 ? (
                            <p className="p-8 text-center text-sm text-neutral-500">No linked transactions found.</p>
                        ) : (
                            entityTxs.slice(0, 10).map(tx => (
                                <div key={tx.id} className="p-3 border-b border-platinum-100 dark:border-neutral-800 flex justify-between items-center text-sm hover:bg-platinum-50 dark:hover:bg-neutral-800 transition-colors">
                                    <span className="text-neutral-900 dark:text-white font-medium">{tx.name || tx.description}</span>
                                    <div className="text-right">
                                        <span className={`block font-mono font-bold ${tx.type === 'credit' ? 'text-green-500' : 'text-neutral-900 dark:text-white'}`}>
                                            {tx.type === 'credit' ? '+' : ''}{formatCurrency(tx.numericAmount, baseCurrency)}
                                        </span>
                                        <span className="text-[10px] text-neutral-500">{new Date(tx.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        );
    }

    // --- PORTFOLIO DASHBOARD RENDER ---

    return (
        <div className="animate-fade-in space-y-8 pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Activity size={20} className="text-gold-500" /> {t('business.executiveOverview')}
                    </h2>
                    <p className="text-neutral-500 text-sm">Portfolio Health & Performance</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-2 bg-gold-500 text-neutral-950 px-4 py-2 rounded-xl font-bold hover:bg-gold-400 transition-colors shadow-lg">
                    <Plus size={18} /> {t('business.newEntity')}
                </button>
            </div>

            {/* Portfolio Financial Summary */}
            {entities.length > 0 && (() => {
                // Calculate Portfolio Totals
                const allBusinessTxs = transactions.filter(t => t.business_id);
                const totalRev = allBusinessTxs.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.numericAmount, 0);
                const totalExp = allBusinessTxs.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.numericAmount, 0);
                const totalNet = totalRev - totalExp;

                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 rounded-3xl bg-neutral-900 text-white flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={64} /></div>
                            <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Portfolio Revenue</p>
                            <p className="text-3xl font-display font-bold">{formatCurrency(totalRev, baseCurrency)}</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 flex flex-col justify-between">
                            <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Total Expenses</p>
                            <p className="text-3xl font-mono font-bold text-neutral-900 dark:text-white">{formatCurrency(totalExp, baseCurrency)}</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-gold-500 text-neutral-950 flex flex-col justify-between shadow-lg shadow-gold-500/20">
                            <p className="text-xs font-bold text-neutral-800 uppercase mb-2">Net Portfolio Profit</p>
                            <p className="text-3xl font-mono font-bold">{formatCurrency(totalNet, baseCurrency)}</p>
                        </div>
                    </div>
                );
            })()}

            {/* Portfolio Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {entities.map(entity => {
                    const health = healthScores[entity.id];
                    const score = health?.overall_score || 0;
                    const status = health?.status || 'healthy';

                    return (
                        <div
                            key={entity.id}
                            onClick={() => setSelectedEntityId(entity.id)}
                            className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-2xl p-6 hover:border-gold-500/30 transition-all shadow-sm group relative overflow-hidden cursor-pointer hover:shadow-lg"
                        >
                            {/* Score Indicator */}
                            <div className={`absolute top-0 right-0 p-3 flex flex-col items-center justify-center w-12 rounded-bl-2xl border-b border-l 
                                ${status === 'healthy' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                    status === 'at_risk' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}>
                                <span className="text-xs font-bold">{score}</span>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${entity.type === 'channel' ? 'bg-blue-600' : 'bg-neutral-700'}`}>
                                    {entity.type === 'channel' ? <Globe size={20} /> : <Building size={20} />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-gold-500 transition-colors">{entity.name}</h4>
                                    <p className="text-xs text-neutral-500 capitalize">{entity.type}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                {health?.diagnosis?.top_detractors.slice(0, 2).map(detractor => (
                                    <div key={detractor} className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 p-1.5 rounded">
                                        <AlertTriangle size={12} />
                                        <span className="capitalize">{detractor.replace(/_/g, ' ')}</span>
                                    </div>
                                ))}
                                {(!health || health.diagnosis.top_detractors.length === 0) && (
                                    <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/5 p-1.5 rounded">
                                        <CheckCircle size={12} />
                                        <span>Systems Nominal</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-platinum-200 dark:border-neutral-800 flex items-center justify-between">
                                <span className="text-xs text-neutral-400 font-bold">View Diagnosis</span>
                                <div className="w-8 h-8 rounded-full bg-platinum-100 dark:bg-neutral-950 flex items-center justify-center text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {entities.length === 0 && (
                    <div className="col-span-full py-12 text-center text-neutral-500 bg-neutral-900/50 rounded-3xl border border-dashed border-neutral-800">
                        <Building size={48} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-white">Empty Portfolio</h3>
                        <p className="text-sm">Add your first business entity to initialize the KPI engine.</p>
                    </div>
                )}
            </div>

            {/* Wizard Modal (Minimal Inline implementation for speed) */}
            {isWizardOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 animate-zoom-in">
                        <h3 className="text-xl font-bold text-white mb-4">New Business Entity</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Name</label>
                                <input className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white" value={wizardName} onChange={e => setWizardName(e.target.value)} placeholder="e.g. Flagship Store" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Type</label>
                                <select className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white" value={wizardType} onChange={e => setWizardType(e.target.value)}>
                                    <option value="store">Physical Store</option>
                                    <option value="channel">E-Commerce Channel</option>
                                    <option value="real_estate">Real Estate</option>
                                    <option value="subsidiary">Subsidiary / Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">KPI Pack Mode</label>
                                <select className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white" value={wizardPack} onChange={e => setWizardPack(e.target.value)}>
                                    <option value="">-- No Pack (Manual Config) --</option>
                                    {metricPacks.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-neutral-500 mt-1">Applying a pack will auto-create relevant KPI targets.</p>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setIsWizardOpen(false)} className="flex-1 py-3 text-neutral-400 hover:text-white">Cancel</button>
                                <button onClick={handleQuickAdd} disabled={!wizardName} className="flex-1 bg-gold-500 text-neutral-950 font-bold rounded-lg hover:bg-gold-400">Launch</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
