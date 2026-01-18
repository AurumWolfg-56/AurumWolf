import React, { useState, useRef } from 'react';
import { Search, Tag, Check, Plus } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface CategorySelectProps {
    value: string;
    onChange: (val: string) => void;
    suggestions?: string[];
    placeholder?: string;
    compact?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, placeholder = "Select Category...", compact = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedCat = CATEGORIES.find(c => c.name === value);
    // If not in predefined list, it's a custom string
    const isCustom = value && !selectedCat;

    const filtered = CATEGORIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {!compact && <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Category</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-white dark:bg-neutral-900 border ${isOpen ? 'border-gold-500' : 'border-platinum-200 dark:border-neutral-800'} ${compact ? 'py-2 px-3 text-xs' : 'py-3 px-4 text-sm'} rounded-xl text-neutral-900 dark:text-white transition-all`}
            >
                {selectedCat ? (
                    <div className="flex items-center gap-2">
                        <div
                            className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} rounded-full flex items-center justify-center text-neutral-950`}
                            style={{ backgroundColor: selectedCat.color }}
                        >
                            <selectedCat.icon size={compact ? 10 : 14} />
                        </div>
                        <span className="font-semibold">{selectedCat.name}</span>
                    </div>
                ) : isCustom ? (
                    <div className="flex items-center gap-2">
                        <div
                            className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} rounded-full flex items-center justify-center bg-platinum-100 dark:bg-neutral-800 text-neutral-400`}
                        >
                            <Tag size={compact ? 10 : 14} />
                        </div>
                        <span className="font-semibold text-neutral-900 dark:text-white">{value}</span>
                    </div>
                ) : (
                    <span className="text-neutral-500">{placeholder}</span>
                )}
                <div className="text-neutral-400 dark:text-neutral-600 text-[10px]">▼</div>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-neutral-900 border border-platinum-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in max-h-64 flex flex-col">
                    <div className="p-3 border-b border-platinum-200 dark:border-neutral-800 shrink-0 bg-platinum-50 dark:bg-neutral-950">
                        <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 rounded-lg px-3 py-2 border border-platinum-200 dark:border-neutral-800 focus-within:border-gold-500/50 transition-colors">
                            <Search size={14} className="text-neutral-500" />
                            <input
                                autoFocus
                                className="bg-transparent border-none outline-none text-xs text-neutral-900 dark:text-white w-full placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                                placeholder="Search or create..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto p-2 custom-scrollbar text-neutral-900 dark:text-white">
                        {filtered.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => { onChange(cat.name); setIsOpen(false); setSearch(''); }}
                                className="w-full flex items-center gap-3 p-2 hover:bg-platinum-100 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
                            >
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-950 shrink-0"
                                    style={{ backgroundColor: cat.color }}
                                >
                                    <cat.icon size={14} />
                                </div>
                                <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-black dark:group-hover:text-white font-medium text-left flex-1">{cat.name}</span>
                                {value === cat.name && <Check size={14} className="text-gold-500" />}
                            </button>
                        ))}

                        {search && !filtered.some(c => c.name.toLowerCase() === search.toLowerCase()) && (
                            <button
                                type="button"
                                onClick={() => { onChange(search); setIsOpen(false); setSearch(''); }}
                                className="w-full flex items-center gap-3 p-2 hover:bg-platinum-100 dark:hover:bg-neutral-800 rounded-lg transition-colors group border-t border-platinum-200 dark:border-neutral-800 mt-1"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gold-500/20 text-gold-500 shrink-0">
                                    <Plus size={14} />
                                </div>
                                <div className="text-left flex-1">
                                    <span className="text-sm text-neutral-900 dark:text-white font-bold block">Create "{search}"</span>
                                    <span className="text-[10px] text-neutral-500">Add as new custom category</span>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
