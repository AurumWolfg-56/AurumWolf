
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { BusinessEntity, Transaction } from '../types';
import { MetricDefinition, MetricPack, BusinessMetric, MetricSnapshot, BusinessHealthSnapshot } from '../lib/business/types';
import { calculateMetricValue, computeBusinessHealth } from '../lib/business/kpi_engine';
import { useTransactions } from './TransactionsContext';

interface BusinessContextType {
    entities: BusinessEntity[];
    metricDefinitions: MetricDefinition[];
    metricPacks: MetricPack[];
    businessMetrics: Record<string, BusinessMetric[]>; // business_id -> metrics
    latestSnapshots: Record<string, MetricSnapshot[]>; // business_id -> snapshots
    healthScores: Record<string, BusinessHealthSnapshot>; // business_id -> health

    loading: boolean;
    error: string | null;

    addEntity: (entity: BusinessEntity, packId?: string) => Promise<void>;
    updateEntity: (entity: BusinessEntity) => Promise<void>;
    deleteEntity: (id: string) => Promise<void>;
    refreshEntities: () => Promise<void>;
    runAnalysis: () => Promise<void>; // Trigger calculation
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { transactions } = useTransactions();

    const [entities, setEntities] = useState<BusinessEntity[]>([]);
    const [metricDefinitions, setMetricDefinitions] = useState<MetricDefinition[]>([]);
    const [metricPacks, setMetricPacks] = useState<MetricPack[]>([]);
    const [businessMetrics, setBusinessMetrics] = useState<Record<string, BusinessMetric[]>>({});
    const [latestSnapshots, setLatestSnapshots] = useState<Record<string, MetricSnapshot[]>>({});
    const [healthScores, setHealthScores] = useState<Record<string, BusinessHealthSnapshot>>({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Static Metadata
    const fetchMetadata = async () => {
        const { data: defs } = await supabase.from('metric_definitions').select('*');
        if (defs) setMetricDefinitions(defs);

        const { data: packs } = await supabase.from('metric_packs').select('*, items:metric_pack_items(*)');
        if (packs) setMetricPacks(packs);
    };

    // 2. Fetch User Data
    const fetchUserData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Entities
            const { data: entData } = await supabase.from('business_entities').select('*').eq('user_id', user.id);
            setEntities(entData || []);

            // Configs
            if (entData && entData.length > 0) {
                const ids = entData.map(e => e.id);
                const { data: metData } = await supabase.from('business_metrics').select('*').in('business_id', ids);

                // Group by business
                const groupedMetrics: Record<string, BusinessMetric[]> = {};
                metData?.forEach((m: BusinessMetric) => {
                    if (!groupedMetrics[m.business_id]) groupedMetrics[m.business_id] = [];
                    groupedMetrics[m.business_id].push(m);
                });
                setBusinessMetrics(groupedMetrics);

                // Fetch Latest Snapshots (Simplification: just getting all for now, in prod limit by date)
                const { data: snapData } = await supabase.from('metric_snapshots').select('*').in('business_id', ids);
                const groupedSnaps: Record<string, MetricSnapshot[]> = {};
                snapData?.forEach((s: MetricSnapshot) => {
                    if (!groupedSnaps[s.business_id]) groupedSnaps[s.business_id] = [];
                    groupedSnaps[s.business_id].push(s);
                });
                setLatestSnapshots(groupedSnaps);
            }

        } catch (err: any) {
            console.error("Error loading business data:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchUserData();
    }, [user]);

    // 3. Analysis Engine
    const runAnalysis = async () => {
        if (!user || entities.length === 0) return;

        const newSnapshots: MetricSnapshot[] = [];
        const newHealthScores: Record<string, BusinessHealthSnapshot> = {};

        // For each business
        for (const entity of entities) {
            const configs = businessMetrics[entity.id] || [];
            const entityTxs = transactions.filter(t => t.business_id === entity.id);
            const calculatedMetrics: { config: BusinessMetric, currentVal: number }[] = [];

            // Calculate each metric
            for (const config of configs) {
                const value = calculateMetricValue(config.metric_id, entityTxs);
                calculatedMetrics.push({ config, currentVal: value });

                // Construct Snapshot Object (Pending DB Insert)
                // In a real app, we upsert this to DB. Here we store in state for UI speed.
            }

            // Compute Health
            const health = computeBusinessHealth(calculatedMetrics);
            newHealthScores[entity.id] = health;
        }

        setHealthScores(newHealthScores);
        // Note: Real "Persistence" of snapshots would happen here via supabase.insert
    };

    // Auto-run analysis when transactions change
    useEffect(() => {
        if (!loading && entities.length > 0) {
            runAnalysis();
        }
    }, [transactions.length, entities.length, loading]);


    const addEntity = async (entity: BusinessEntity, packId?: string) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('business_entities')
                .insert([{
                    user_id: user.id,
                    name: entity.name,
                    type: entity.type,
                    parent_id: entity.parent_id
                }])
                .select()
                .single();

            if (error) throw error;
            const newId = data.id;

            // Apply Pack if selected
            if (packId) {
                const pack = metricPacks.find(p => p.id === packId);
                if (pack && pack.items) {
                    const metricsPayload = pack.items.map(item => ({
                        business_id: newId,
                        metric_id: item.metric_id,
                        weight: item.default_weight,
                        is_higher_better: item.default_is_higher_better,
                        is_active: true,
                        frequency: 'monthly'
                    }));
                    await supabase.from('business_metrics').insert(metricsPayload);
                }
            }

            // Refresh Local State
            await fetchUserData();

        } catch (err: any) {
            console.error('Error adding business:', err);
            setError(err.message);
        }
    };

    const updateEntity = async (entity: BusinessEntity) => {
        if (!user) return;
        try {
            // 1. Update Core Entity
            const { error: entError } = await supabase
                .from('business_entities')
                .update({
                    name: entity.name,
                    type: entity.type,
                    parent_id: entity.parent_id
                })
                .eq('id', entity.id);

            if (entError) throw entError;

            // 2. Sync Metrics Configuration
            // frontend uses 'customMetricsConfig' to show active metrics.
            // We need to sync this list with 'business_metrics' table.
            if (entity.customMetricsConfig) {
                const currentMetrics = businessMetrics[entity.id] || [];
                const newMetricIds = entity.customMetricsConfig;

                // A. Identify Metrics to ADD
                const toAdd = newMetricIds.filter(id => !currentMetrics.find(m => m.metric_id === id));
                if (toAdd.length > 0) {
                    const toInsert = toAdd.map(mid => ({
                        business_id: entity.id,
                        metric_id: mid,
                        is_active: true,
                        // Defaults
                        weight: 1,
                        is_higher_better: true,
                        frequency: 'monthly'
                    }));
                    await supabase.from('business_metrics').insert(toInsert);
                }

                // B. Identify Metrics to REMOVE
                const toRemove = currentMetrics.filter(m => !newMetricIds.includes(m.metric_id));
                if (toRemove.length > 0) {
                    const removeIds = toRemove.map(m => m.id);
                    await supabase.from('business_metrics').delete().in('id', removeIds);
                }
            }

            // 3. Update Custom Values (Targets)
            // If the UI is sending customValues, we treat them as 'target_value' updates for now
            if (entity.customMetricsValues) {
                for (const [metricId, value] of Object.entries(entity.customMetricsValues)) {
                    // Update the specific metric row
                    await supabase
                        .from('business_metrics')
                        .update({ target_value: value })
                        .eq('business_id', entity.id)
                        .eq('metric_id', metricId);
                }
            }

            // 4. Refresh State
            await fetchUserData(); // Simplest way to ensure consistency

        } catch (err: any) {
            console.error('Error updating business:', err);
            setError(err.message);
        }
    };

    const deleteEntity = async (id: string) => {
        if (!user) return;
        try {
            // Supabase Cascade Delete should handle relations, but let's be explicit if needed.
            // Assuming table was created with ON DELETE CASCADE for metrics/snapshots.

            const { error } = await supabase.from('business_entities').delete().eq('id', id);
            if (error) throw error;

            // Optimistic Update
            setEntities(prev => prev.filter(e => e.id !== id));

            // Clean up related state maps to prevent ghost data
            const newMetrics = { ...businessMetrics };
            delete newMetrics[id];
            setBusinessMetrics(newMetrics);

            const newSnaps = { ...latestSnapshots };
            delete newSnaps[id];
            setLatestSnapshots(newSnaps);

            const newHealth = { ...healthScores };
            delete newHealth[id];
            setHealthScores(newHealth);

        } catch (err: any) {
            console.error("Error deleting business:", err);
            setError(err.message);
        }
    };

    const value = {
        entities,
        metricDefinitions,
        metricPacks,
        businessMetrics,
        latestSnapshots,
        healthScores,
        loading,
        error,
        addEntity,
        updateEntity,
        deleteEntity,
        refreshEntities: fetchUserData,
        runAnalysis
    };

    return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) throw new Error('useBusiness must be used within a BusinessProvider');
    return context;
};
