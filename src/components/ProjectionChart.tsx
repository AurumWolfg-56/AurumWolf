
import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface ProjectionChartProps {
  currentNetWorth: number;
  monthlySurplus: number;
  investableAssets: number;
  baseCurrency: string;
  formatCurrency: (val: number) => string;
}

export const ProjectionChart: React.FC<ProjectionChartProps> = ({ 
  currentNetWorth, 
  monthlySurplus, 
  investableAssets,
  baseCurrency,
  formatCurrency 
}) => {
  const [mode, setMode] = useState<'linear' | 'compound'>('compound');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // --- PROJECTION ENGINE ---
  const data = useMemo(() => {
    const points = [];
    const months = ['Now', '+1M', '+2M', '+3M', '+4M', '+5M', '+6M'];
    const monthlyRate = 0.08 / 12; // 8% Annual Return assumed for compound

    let projectedNW = currentNetWorth;
    let projectedInvestments = investableAssets;

    for (let i = 0; i < 7; i++) {
      points.push({
        label: months[i],
        value: projectedNW,
        growth: projectedNW - currentNetWorth
      });

      if (mode === 'linear') {
        projectedNW += monthlySurplus;
      } else {
        // Compound: Surplus added to investments + Investment Growth
        const investmentGrowth = projectedInvestments * monthlyRate;
        projectedInvestments += monthlySurplus + investmentGrowth;
        // Non-invested assets stay flat (simplified)
        const nonInvested = currentNetWorth - investableAssets; 
        projectedNW = nonInvested + projectedInvestments;
      }
    }
    return points;
  }, [currentNetWorth, monthlySurplus, investableAssets, mode]);

  // --- SVG MATH ---
  const width = 100;
  const height = 50;
  const padding = 2;
  
  const minVal = Math.min(...data.map(d => d.value)) * 0.99;
  const maxVal = Math.max(...data.map(d => d.value)) * 1.01;
  const range = maxVal - minVal || 1;

  const getCoord = (index: number, value: number) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - minVal) / range) * (height - padding * 2);
    return `${x},${y}`;
  };

  const pathD = `M ${data.map((d, i) => getCoord(i, d.value)).join(' L ')}`;
  const areaD = `${pathD} L ${width-padding},${height} L ${padding},${height} Z`;

  const finalValue = data[data.length - 1].value;
  const totalGrowth = finalValue - currentNetWorth;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm dark:shadow-none relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-gold-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={16} className="text-gold-500" /> Wealth Trajectory (6 Mo)
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-mono font-bold text-neutral-900 dark:text-white">
                        {formatCurrency(finalValue)}
                    </span>
                    <span className={`text-xs font-bold ${totalGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalGrowth >= 0 ? '+' : ''}{formatCurrency(totalGrowth)}
                    </span>
                </div>
            </div>
            
            <div className="flex bg-platinum-100 dark:bg-neutral-950 p-1 rounded-lg border border-platinum-200 dark:border-neutral-800">
                <button 
                    onClick={() => setMode('linear')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        mode === 'linear' 
                        ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                >
                    Cash Flow
                </button>
                <button 
                    onClick={() => setMode('compound')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                        mode === 'compound' 
                        ? 'bg-white dark:bg-neutral-800 text-gold-600 dark:text-gold-500 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                >
                    Compound
                </button>
            </div>
        </div>

        {/* Chart */}
        <div className="relative w-full aspect-[2.5/1] group" onMouseLeave={() => setHoveredIndex(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" strokeWidth="0.5" />
                
                {/* Area Fill */}
                <path d={areaD} fill="url(#chartGradient)" className="transition-all duration-500 ease-out" />
                
                {/* Line Stroke */}
                <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#D4AF37" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-[0_4px_6px_rgba(212,175,55,0.3)] transition-all duration-500 ease-out"
                />

                {/* Interactive Points */}
                {data.map((d, i) => {
                    const coords = getCoord(i, d.value).split(',');
                    const cx = parseFloat(coords[0]);
                    const cy = parseFloat(coords[1]);
                    const isActive = hoveredIndex === i || (hoveredIndex === null && i === data.length - 1);
                    
                    return (
                        <g key={i} onMouseEnter={() => setHoveredIndex(i)} className="cursor-crosshair">
                            {/* Hit Area */}
                            <circle cx={cx} cy={cy} r="4" fill="transparent" />
                            
                            {/* Visible Dot */}
                            <circle 
                                cx={cx} 
                                cy={cy} 
                                r={isActive ? 2.5 : 1} 
                                className={`transition-all duration-300 ${isActive ? 'fill-white stroke-gold-500' : 'fill-gold-500'}`}
                                strokeWidth={isActive ? 1 : 0}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Hover Tooltip (HTML overlay for easier styling) */}
            {data.map((d, i) => {
                 const isActive = hoveredIndex === i || (hoveredIndex === null && i === data.length - 1);
                 if (!isActive) return null;
                 
                 // Calculate Percentage Left
                 const leftPct = (i / (data.length - 1)) * 100;
                 const isRight = leftPct > 70;
                 const isLeft = leftPct < 30;

                 return (
                     <div 
                        key={i}
                        className={`absolute top-0 flex flex-col pointer-events-none transition-all duration-200 ${
                            isRight ? 'items-end right-0' : isLeft ? 'items-start left-0' : 'items-center left-1/2 -translate-x-1/2'
                        }`}
                     >
                         <div className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl border border-neutral-800 mb-1 backdrop-blur-sm">
                             {d.label}: {formatCurrency(d.value)}
                         </div>
                         <div className="w-px h-full bg-neutral-300 dark:bg-neutral-700 border-l border-dashed border-neutral-400 dark:border-neutral-600 opacity-50 absolute top-full h-[100px]"></div>
                     </div>
                 )
            })}
        </div>

        <div className="flex justify-between mt-2 px-1">
            {data.map((d, i) => (
                <span key={i} className={`text-[9px] font-bold uppercase transition-colors ${
                    (hoveredIndex === i || (hoveredIndex === null && i === data.length - 1)) 
                    ? 'text-neutral-900 dark:text-white' 
                    : 'text-neutral-400'
                }`}>
                    {d.label}
                </span>
            ))}
        </div>
        
        <p className="mt-4 text-[10px] text-neutral-500 text-center">
            {mode === 'compound' 
                ? "* Assumes 8% annual market return on investable assets." 
                : "* Linear projection based on current monthly surplus."}
        </p>
    </div>
  );
};
