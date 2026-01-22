"use client";

import { Wallet } from "@/services/wallets.api";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import clsx from "clsx";

type WalletSelectorProps = {
  wallets: Wallet[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
  label?: string;
};

const formatMoney = (val: number) => (val / 100).toFixed(0) + ' ₽';

export function WalletSelector({ wallets, selectedId, onSelect, onAdd, label }: WalletSelectorProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
           <span className="text-sm font-medium text-gray-700">{label}</span>
           <div className="flex gap-2">
              <button type="button" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={16} /></button>
              <button type="button" className="text-gray-400 hover:text-gray-600"><ChevronRight size={16} /></button>
           </div>
        </div>
      )}
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {wallets.map(w => (
          <div 
            key={w.id} 
            onClick={() => onSelect(w.id)}
            className={clsx(
              "min-w-[140px] rounded-xl p-4 cursor-pointer transition-all border-2 flex flex-col justify-between h-[80px]",
              selectedId === w.id 
                ? "bg-[#e5e3d5] border-black" 
                : "bg-[#f5f5f5] border-transparent hover:bg-gray-200"
            )}
          >
             <div className="font-bold text-gray-900">{formatMoney(w.balance)}</div>
             <div className="text-xs text-gray-600 truncate">{w.name}</div>
          </div>
        ))}
        
        {onAdd && (
          <button 
            type="button"
            onClick={onAdd}
            className="min-w-[60px] h-[80px] rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 shrink-0"
          >
             <Plus size={20} className="text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}
