"use client";

import { useEffect, useState } from "react";
import { getFinanceSummary, getFinanceTransactions, addIncome, addExpense, transferMoney, FinanceSummary, FinanceTransaction } from "@/services/finance.api";
import { getWallets, Wallet } from "@/services/wallets.api";
import { getCategories, createCategory, deleteCategory, Category } from "@/services/categories.api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Segmented } from "./Segmented";
import { Donut } from "./Donut";
import { WalletSelector } from "./WalletSelector";
import { CategorySelector } from "./CategorySelector";
import { Plus, ArrowUpRight, HelpCircle, ChevronLeft, ChevronRight, Search, Settings, X, Trash2, Link as LinkIcon } from "lucide-react";
import clsx from "clsx";

const formatMoney = (val: number) => (val / 100).toFixed(0) + ' ₽';

export function FinanceTab() {
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("month");
  const [summary, setSummary] = useState<FinanceSummary>({ income: 0, expense: 0, net: 0 });
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [targetWallet, setSelectedTargetWallet] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Settings states
  const [newCategoryName, setNewCategoryName] = useState("");

  const load = async () => {
    try {
      const [sumRes, txRes, walletsRes, catsRes] = await Promise.all([
        getFinanceSummary(),
        getFinanceTransactions(),
        getWallets(),
        getCategories()
      ]);
      setSummary(sumRes.data);
      setTransactions(txRes.data);
      setWallets(walletsRes.data);
      setCategories(catsRes.data);
      if (walletsRes.data.length > 0 && !selectedWallet) {
        setSelectedWallet(walletsRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  const resetForm = () => {
    setAmount("");
    setComment("");
    setSelectedCategory(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
    if (wallets.length > 0) setSelectedWallet(wallets[0].id);
    setSelectedTargetWallet("");
  };

  const handleSubmit = async (type: "INCOME" | "EXPENSE" | "TRANSFER") => {
    const val = parseFloat(amount) * 100;
    if (isNaN(val) || val <= 0) return;
    if (!selectedWallet) return;

    setSubmitting(true);
    try {
      const dateTime = new Date(`${date}T${time}`);
      
      if (type === "INCOME") {
        await addIncome({ 
          walletId: selectedWallet, 
          amount: val, 
          comment, 
          categoryId: selectedCategory,
          date: dateTime 
        });
        setIncomeOpen(false);
      } else if (type === "EXPENSE") {
        await addExpense({ 
          walletId: selectedWallet, 
          amount: val, 
          comment, 
          categoryId: selectedCategory,
          date: dateTime 
        });
        setExpenseOpen(false);
      } else {
        if (!targetWallet) return;
        await transferMoney({ 
          fromWalletId: selectedWallet, 
          toWalletId: targetWallet, 
          amount: val, 
          comment,
          date: dateTime 
        });
        setTransferOpen(false);
      }
      resetForm();
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async (type: 'INCOME' | 'EXPENSE') => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({ type, name: newCategoryName.trim() });
      setNewCategoryName("");
      const res = await getCategories();
      setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      const res = await getCategories();
      setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button 
            onClick={() => { resetForm(); setIncomeOpen(true); }}
            className="flex items-center gap-2 rounded-full bg-[#d4fc46] px-6 py-3 font-medium text-black hover:bg-[#c2f02d] transition"
          >
            <HelpCircle size={18} className="opacity-50" />
            Добавить доход
            <div className="bg-black text-white rounded-full p-1 ml-2"><Plus size={14} /></div>
          </button>
          
          <button 
            onClick={() => { resetForm(); setExpenseOpen(true); }}
            className="flex items-center gap-2 rounded-full bg-[#ff5bf6] px-6 py-3 font-medium text-white hover:bg-[#e64ede] transition"
          >
            <HelpCircle size={18} className="opacity-50" />
            Добавить расход
            <div className="bg-black text-white rounded-full p-1 ml-2"><Plus size={14} /></div>
          </button>

          <button 
            onClick={() => { resetForm(); setTransferOpen(true); }}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-gray-900 shadow-sm hover:bg-gray-50 transition"
          >
            Перенести
            <ArrowUpRight size={18} className="ml-2" />
          </button>

          <button 
            onClick={() => setSettingsOpen(true)}
            className="ml-auto flex items-center justify-center w-12 h-12 rounded-full bg-white text-gray-400 hover:text-gray-600 border border-gray-100"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Period Selector & Donut Charts */}
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { value: "week", label: "Неделя" },
                { value: "month", label: "Месяц" },
                { value: "year", label: "Год" },
                { value: "all", label: "Все время" },
              ]}
            />
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <button className="hover:text-gray-900"><ChevronLeft size={20} /></button>
              <span>01.2026</span>
              <button className="hover:text-gray-900"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-8">
            <Donut
              label="доходы"
              valueText={formatMoney(summary.income)}
              value={summary.income}
              total={summary.income + summary.expense || 1}
            />
            <Donut
              label="расходы"
              valueText={formatMoney(summary.expense)}
              value={summary.expense}
              total={summary.income + summary.expense || 1}
            />
          </div>

          <div className="flex justify-end items-center gap-4">
             <div className="text-right">
                <div className="text-sm text-gray-500">Чистая прибыль</div>
                <div className="text-xl font-bold">{formatMoney(summary.net)}</div>
             </div>
             <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                Графики <ArrowUpRight size={16} />
             </button>
          </div>
        </div>

        {/* Wallets Horizontal Scroll */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-900">Кошелек</h3>
             <div className="flex gap-2">
                <button><ChevronLeft size={18} className="text-gray-400" /></button>
                <button><ChevronRight size={18} className="text-gray-400" /></button>
             </div>
          </div>
          
          <WalletSelector 
             wallets={wallets} 
             selectedId="" 
             onSelect={() => {}} 
             onAdd={() => {}}
          />
        </div>
      </div>

      {/* Right Sidebar - History */}
      <div className="w-full lg:w-80 rounded-3xl bg-white p-6 shadow-sm h-fit min-h-[500px]">
        <div className="flex items-center justify-between mb-6">
           <div className="font-bold text-lg">История</div>
           <HelpCircle size={18} className="text-gray-400" />
        </div>

        <div className="flex items-center gap-2 mb-6">
           <span className="text-sm text-gray-500">Период</span>
           <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-2 py-1 text-sm text-gray-600">
              <span>13.01.2026</span>
              <span className="mx-1">-</span>
              <span>20.01.2026</span>
           </div>
           <button className="p-1 hover:bg-gray-100 rounded-full"><Search size={18} className="text-gray-400" /></button>
        </div>

        <div className="space-y-4">
           {transactions.length === 0 ? (
             <div className="text-center text-sm text-gray-400 py-10">
               За выбранный период операций нет
             </div>
           ) : (
             transactions.map(t => (
               <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                 <div>
                   <div className="font-medium text-sm">{t.comment || (t.type === 'INCOME' ? 'Доход' : 'Расход')}</div>
                   <div className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</div>
                 </div>
                 <div className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                   {t.type === 'INCOME' ? '+' : '-'}{formatMoney(t.amount)}
                 </div>
               </div>
             ))
           )}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={incomeOpen} onClose={() => setIncomeOpen(false)} title="Добавить доход">
        <div className="space-y-6">
          <CategorySelector 
             categories={categories} 
             selectedId={selectedCategory} 
             onSelect={setSelectedCategory} 
             type="INCOME"
             onAdd={() => { setIncomeOpen(false); setSettingsOpen(true); }}
          />

          <div className="flex gap-4">
             <div className="flex-1">
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Сумма" />
             </div>
             <div className="w-32">
                <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
             </div>
             <div className="w-24">
                <Input value={time} onChange={(e) => setTime(e.target.value)} type="time" />
             </div>
          </div>

          <WalletSelector 
             wallets={wallets} 
             selectedId={selectedWallet} 
             onSelect={setSelectedWallet} 
             label="На какой кошелек зачислить"
             onAdd={() => {}}
          />

          <div className="space-y-1">
             <label className="text-sm font-medium text-gray-700">Примечание</label>
             <textarea 
                className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none min-h-[100px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Напишите комментарий..."
             />
          </div>

          <Button onClick={() => handleSubmit("INCOME")} disabled={submitting} className="bg-[#d4fc46] text-black hover:bg-[#c2f02d]">
             Добавить
          </Button>
        </div>
      </Modal>

      <Modal isOpen={expenseOpen} onClose={() => setExpenseOpen(false)} title="Добавить расход">
        <div className="space-y-6">
          <CategorySelector 
             categories={categories} 
             selectedId={selectedCategory} 
             onSelect={setSelectedCategory} 
             type="EXPENSE"
             onAdd={() => { setExpenseOpen(false); setSettingsOpen(true); }}
          />

          <div className="flex gap-4">
             <div className="flex-1">
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Сумма" />
             </div>
             <div className="w-32">
                <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
             </div>
             <div className="w-24">
                <Input value={time} onChange={(e) => setTime(e.target.value)} type="time" />
             </div>
          </div>

          <WalletSelector 
             wallets={wallets} 
             selectedId={selectedWallet} 
             onSelect={setSelectedWallet} 
             label="С какого кошелька списать"
             onAdd={() => {}}
          />

          <div className="space-y-1">
             <label className="text-sm font-medium text-gray-700">Примечание</label>
             <textarea 
                className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none min-h-[100px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Напишите комментарий..."
             />
          </div>

          <Button onClick={() => handleSubmit("EXPENSE")} disabled={submitting} className="bg-[#ff5bf6] text-white hover:bg-[#e64ede]">
             Добавить
          </Button>
        </div>
      </Modal>

      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Перенести средства">
        <div className="space-y-6">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Сумма" />

          <WalletSelector 
             wallets={wallets} 
             selectedId={selectedWallet} 
             onSelect={setSelectedWallet} 
             label="С какого кошелька списать"
          />

          <WalletSelector 
             wallets={wallets} 
             selectedId={targetWallet} 
             onSelect={setSelectedTargetWallet} 
             label="На какой кошелек зачислить"
             onAdd={() => {}}
          />

          <Button onClick={() => handleSubmit("TRANSFER")} disabled={submitting} className="bg-indigo-500 hover:bg-indigo-600 text-white">
             Перенести
          </Button>
        </div>
      </Modal>

      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Настройки">
        <div className="space-y-8">
          {/* Income Categories */}
          <div className="space-y-4">
             <h3 className="font-bold text-gray-900">Категории доходов</h3>
             <div className="flex flex-wrap gap-2">
                <div className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#d4fc46] text-black">Не выбрано</div>
                {categories.filter(c => c.type === 'INCOME').map(c => (
                   <div key={c.id} className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#d4fc46] text-black flex items-center gap-2 group">
                      {c.name}
                      <button onClick={() => handleDeleteCategory(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <X size={14} />
                      </button>
                   </div>
                ))}
             </div>
             <div className="flex gap-2">
                <input 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Новая категория" 
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <Button onClick={() => handleAddCategory('INCOME')} className="w-auto px-6 bg-indigo-500 hover:bg-indigo-600">Добавить</Button>
             </div>
          </div>

          {/* Expense Categories */}
          <div className="space-y-4">
             <h3 className="font-bold text-gray-900">Категории расходов</h3>
             <div className="flex flex-wrap gap-2">
                <div className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#ff5bf6] text-white">Не выбрано</div>
                {categories.filter(c => c.type === 'EXPENSE').map(c => (
                   <div key={c.id} className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#ff5bf6] text-white flex items-center gap-2 group">
                      {c.name}
                      <LinkIcon size={12} className="opacity-50" />
                      <button onClick={() => handleDeleteCategory(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <X size={14} />
                      </button>
                   </div>
                ))}
             </div>
             <div className="flex gap-2">
                <input 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Новая категория" 
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <Button onClick={() => handleAddCategory('EXPENSE')} className="w-auto px-6 bg-indigo-500 hover:bg-indigo-600">Добавить</Button>
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
