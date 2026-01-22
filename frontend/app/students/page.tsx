"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { createStudent, getStudents } from "@/services/students.api";
import { createStudentInvite } from "@/services/invites.api";
import { getWallets, Wallet } from "@/services/wallets.api";
import {
  createHomeworkTemplate,
  createStudentHomeworkTask,
  createStudentPayment,
  createStudentSubscription,
  deleteHomeworkTemplate,
  deleteStudentBalanceEvent,
  deleteStudentHomeworkTask,
  finishStudentSubscription,
  getStudentBalanceEvents,
  getStudentHomeworkTasks,
  getStudentSubscriptions,
  listHomeworkTemplates,
  updateStudent,
  updateStudentHomeworkTask,
} from "@/services/studentPanel.api";
import { getApiErrorMessage } from "@/services/apiError";

type Student = {
  id: string;
  name: string;
  contact?: string | null;
  notes?: string | null;
  balance: number;
  accountUserId?: string | null;
  rateAmount?: number | null;
  rateMinutes?: number | null;
};

type TabKey = "active" | "archive";

const badgeClassName =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-xs font-semibold text-white";

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) => {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-gray-900">
        {label}
        {required ? "*" : null}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        type={type ?? "text"}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
};

const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-gray-900">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
};

const EmptyStudentsIllustration = () => {
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-purple-50 ring-1 ring-purple-100">
      <svg width="58" height="58" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          d="M32 4l7.2 15.5 16.8 2-12.3 11.7 3.3 16.8L32 42.7 17 50l3.3-16.8L8 21.5l16.8-2L32 4z"
          fill="#7C3AED"
          opacity="0.9"
        />
        <circle cx="26" cy="28" r="4" fill="white" />
        <circle cx="38" cy="28" r="4" fill="white" />
        <circle cx="27" cy="29" r="2" fill="#111827" />
        <circle cx="39" cy="29" r="2" fill="#111827" />
      </svg>
    </div>
  );
};

export default function StudentsPage() {
  const { loading: authLoading, user } = useRequireAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("active");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const [newStudentName, setNewStudentName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentEveryDays, setPaymentEveryDays] = useState("60");
  const [paymentCurrency, setPaymentCurrency] = useState("RUB");
  const [extraOpen, setExtraOpen] = useState(true);
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const groupsRef = useRef<HTMLDivElement | null>(null);
  const [toastText, setToastText] = useState<string>("");

  const [studentPanelOpen, setStudentPanelOpen] = useState(false);
  const [studentPanelTab, setStudentPanelTab] = useState<"payment" | "info">("payment");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balanceEvents, setBalanceEvents] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionsShowFinished, setSubscriptionsShowFinished] = useState(false);
  const [eventsFrom, setEventsFrom] = useState("");
  const [eventsTo, setEventsTo] = useState("");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmountRub, setPaymentAmountRub] = useState("");
  const [paymentWalletId, setPaymentWalletId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [tariffOpen, setTariffOpen] = useState(false);
  const [tariffAmount, setTariffAmount] = useState("");
  const [tariffMinutes, setTariffMinutes] = useState("60");
  const [tariffSaving, setTariffSaving] = useState(false);

  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionTitle, setSubscriptionTitle] = useState("");
  const [subscriptionLessons, setSubscriptionLessons] = useState("8");
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);

  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const [homeworkTab, setHomeworkTab] = useState<"current" | "templates">("current");
  const [homeworkFrom, setHomeworkFrom] = useState("");
  const [homeworkTo, setHomeworkTo] = useState("");
  const [homeworkQuery, setHomeworkQuery] = useState("");
  const [homeworkTasks, setHomeworkTasks] = useState<any[]>([]);
  const [homeworkTemplates, setHomeworkTemplates] = useState<any[]>([]);
  const [homeworkAddOpen, setHomeworkAddOpen] = useState(false);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [homeworkTemplateId, setHomeworkTemplateId] = useState("");
  const [homeworkSaving, setHomeworkSaving] = useState(false);
  const [templateAddOpen, setTemplateAddOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);

  const selectedStudent = useMemo(() => students.find((s) => s.id === selectedStudentId) ?? null, [selectedStudentId, students]);

  const formatTariff = (s: Student | null) => {
    if (!s || !s.rateAmount) return "Тариф: —";
    const minutes = s.rateMinutes || 60;
    return `Тариф: ${s.rateAmount.toFixed(0)} ₽ / ${minutes} мин.`;
  };

  const toIsoFromDateTime = (date: string, time: string) => {
    if (!date) return undefined;
    const t = time || "00:00";
    const iso = new Date(`${date}T${t}:00`).toISOString();
    return iso;
  };

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await getStudents();
      setStudents(res.data);
    } catch {
      setError("Не удалось загрузить учеников");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  useEffect(() => {
    if (!toastText) return;
    const t = window.setTimeout(() => setToastText(""), 3500);
    return () => window.clearTimeout(t);
  }, [toastText]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => (s.name ?? "").toLowerCase().includes(q) || (s.contact ?? "").toLowerCase().includes(q));
  }, [query, students]);

  const resetCreateForm = () => {
    setNewStudentName("");
    setPaymentAmount("");
    setPaymentEveryDays("60");
    setPaymentCurrency("RUB");
    setExtraOpen(true);
    setPhone("");
    setTelegram("");
    setSource("");
    setNotes("");
  };

  const buildNotes = () => {
    const lines: string[] = [];
    const safeTelegram = telegram.trim();
    const safeSource = source.trim();
    const safeNotes = notes.trim();
    const safePhone = phone.trim();

    if (safeTelegram) lines.push(`Telegram: ${safeTelegram}`);
    if (safeSource) lines.push(`Откуда: ${safeSource}`);
    if (safeNotes) lines.push(safeNotes);

    const paymentInfo = [
      paymentAmount.trim() ? `Оплата: ${paymentAmount.trim()} ${paymentCurrency}` : "",
      paymentEveryDays.trim() ? `за ${paymentEveryDays.trim()} дн.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (paymentInfo) lines.push(paymentInfo);

    const merged = lines.filter(Boolean).join("\n");
    const contact = safePhone || safeTelegram || "";

    return { contact: contact || null, notes: merged || null };
  };

  const handleCreate = async () => {
    if (!newStudentName.trim()) return;
    setCreating(true);
    try {
      const meta = buildNotes();
      await createStudent({ name: newStudentName.trim(), contact: meta.contact, notes: meta.notes });
      setAddStudentOpen(false);
      resetCreateForm();
      await load();
    } catch {
      setError("Не удалось создать ученика");
    } finally {
      setCreating(false);
    }
  };

  const loadPanelData = async (studentId: string) => {
    setError("");
    try {
      const [walletRes, eventsRes, subsRes, tplRes, hwRes] = await Promise.all([
        getWallets(),
        getStudentBalanceEvents(studentId, eventsFrom || eventsTo ? { from: eventsFrom || undefined, to: eventsTo || undefined } : undefined),
        getStudentSubscriptions(studentId, subscriptionsShowFinished),
        listHomeworkTemplates(),
        getStudentHomeworkTasks(studentId, homeworkFrom || homeworkTo ? { from: homeworkFrom || undefined, to: homeworkTo || undefined, status: "ASSIGNED" } : { status: "ASSIGNED" }),
      ]);
      setWallets(walletRes.data ?? []);
      setBalanceEvents(eventsRes.data ?? []);
      setSubscriptions(subsRes.data ?? []);
      setHomeworkTemplates(tplRes.data ?? []);
      setHomeworkTasks(hwRes.data ?? []);
      if (!paymentWalletId) {
        const first = (walletRes.data ?? []).find((w: Wallet) => !w.isArchived);
        if (first) setPaymentWalletId(first.id);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось загрузить данные ученика"));
    }
  };

  const openStudentPanel = async (studentId: string, tab: "payment" | "info") => {
    setSelectedStudentId(studentId);
    setStudentPanelTab(tab);
    setStudentPanelOpen(true);
    await loadPanelData(studentId);
  };

  const openPaymentForm = async (studentId: string) => {
    setSelectedStudentId(studentId);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    setPaymentDate(`${yyyy}-${mm}-${dd}`);
    setPaymentTime(`${hh}:${mi}`);
    setPaymentAmountRub("");
    setPaymentNote("");
    setPaymentOpen(true);
    const walletRes = await getWallets();
    setWallets(walletRes.data ?? []);
    if (!paymentWalletId) {
      const first = (walletRes.data ?? []).find((w: Wallet) => !w.isArchived);
      if (first) setPaymentWalletId(first.id);
    }
  };

  const submitPayment = async () => {
    if (!selectedStudent) return;
    const amount = Number(paymentAmountRub);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!paymentWalletId) return;
    setPaymentSubmitting(true);
    setError("");
    try {
      await createStudentPayment(selectedStudent.id, {
        walletId: paymentWalletId,
        amount,
        happenedAt: toIsoFromDateTime(paymentDate, paymentTime),
        note: paymentNote.trim() || undefined,
      });
      await load();
      await loadPanelData(selectedStudent.id);
      setPaymentOpen(false);
      setStudentPanelOpen(true);
      setStudentPanelTab("payment");
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось сохранить оплату"));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const submitTariff = async () => {
    if (!selectedStudent) return;
    const amount = tariffAmount.trim() ? Number(tariffAmount) : 0;
    const minutes = Number(tariffMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    setTariffSaving(true);
    setError("");
    try {
      await updateStudent(selectedStudent.id, { rateAmount: amount > 0 ? amount : 0, rateMinutes: minutes });
      await load();
      setTariffOpen(false);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось сохранить тариф"));
    } finally {
      setTariffSaving(false);
    }
  };

  const submitSubscription = async () => {
    if (!selectedStudent) return;
    const lessonsTotal = Number(subscriptionLessons);
    const price = subscriptionPrice.trim() ? Number(subscriptionPrice) : undefined;
    if (!subscriptionTitle.trim() || !Number.isFinite(lessonsTotal) || lessonsTotal <= 0) return;
    setSubscriptionSaving(true);
    setError("");
    try {
      await createStudentSubscription(selectedStudent.id, {
        title: subscriptionTitle.trim(),
        lessonsTotal,
        price: price && Number.isFinite(price) ? price : undefined,
      });
      setSubscriptionOpen(false);
      setSubscriptionTitle("");
      setSubscriptionLessons("8");
      setSubscriptionPrice("");
      await loadPanelData(selectedStudent.id);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось создать абонемент"));
    } finally {
      setSubscriptionSaving(false);
    }
  };

  const submitHomeworkTemplate = async () => {
    if (!templateTitle.trim() || !templateText.trim()) return;
    setTemplateSaving(true);
    setError("");
    try {
      await createHomeworkTemplate({ title: templateTitle.trim(), text: templateText.trim() });
      setTemplateAddOpen(false);
      setTemplateTitle("");
      setTemplateText("");
      const tplRes = await listHomeworkTemplates();
      setHomeworkTemplates(tplRes.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось создать шаблон"));
    } finally {
      setTemplateSaving(false);
    }
  };

  const submitHomeworkTask = async () => {
    if (!selectedStudent) return;
    if (!homeworkTitle.trim() || !homeworkText.trim()) return;
    setHomeworkSaving(true);
    setError("");
    try {
      await createStudentHomeworkTask(selectedStudent.id, {
        title: homeworkTitle.trim(),
        text: homeworkText.trim(),
        templateId: homeworkTemplateId || undefined,
      });
      setHomeworkAddOpen(false);
      setHomeworkTitle("");
      setHomeworkText("");
      setHomeworkTemplateId("");
      const hwRes = await getStudentHomeworkTasks(selectedStudent.id, { status: "ASSIGNED" });
      setHomeworkTasks(hwRes.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось добавить ДЗ"));
    } finally {
      setHomeworkSaving(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "true");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleInvite = async (studentId: string, studentName: string) => {
    setError("");
    try {
      const res = await createStudentInvite(studentId);
      const token = res.data?.token as string | undefined;
      if (!token) throw new Error("No token");
      const url = `${window.location.origin}/invite/${token}`;
      const ok = await copyText(url);
      if (!ok) throw new Error("Copy failed");
      setToastText(`Скопировано! Передайте ссылку ученику: ${studentName}`);
    } catch {
      setError("Не удалось создать ссылку-приглашение");
    }
  };

  if (authLoading) return <div className="text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex h-11 w-full max-w-[360px] items-center gap-2 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-gray-100">
            <span className="text-gray-300">🔎</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="Поиск"
            />
          </div>

          <div className="flex w-fit items-center rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`h-9 rounded-xl px-4 text-sm transition ${
                tab === "active" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              Активные
            </button>
            <button
              type="button"
              onClick={() => setTab("archive")}
              className={`h-9 rounded-xl px-4 text-sm transition ${
                tab === "archive" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              Архив
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <button
            type="button"
            className="text-sm font-medium text-purple-600 hover:text-purple-700"
            onClick={() => groupsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Перейти к группам
          </button>
          <Button
            onClick={() => setAddStudentOpen(true)}
            className="w-auto rounded-full bg-gray-900 px-6 hover:bg-gray-800 focus:ring-gray-300"
            type="button"
          >
            Добавить ученика
          </Button>
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-100 p-3 text-red-700">{error}</div>}

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Ученики</h2>
          <span className={badgeClassName}>{tab === "archive" ? 0 : filteredStudents.length}</span>
        </div>

        {loading ? (
          <div className="text-gray-500">Загрузка...</div>
        ) : tab === "archive" ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
            <div className="max-w-md">
              <div className="mb-2 text-sm font-semibold text-gray-900">В архиве нет учеников</div>
              <div className="text-sm text-gray-500">Переместите ученика в архив, чтобы он появился здесь.</div>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
            <EmptyStudentsIllustration />
            <div className="text-sm font-semibold text-gray-900">Учеников пока нет</div>
            <div className="max-w-md text-sm text-gray-500">Но можно добавить их, нажав на Добавить ученика</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStudents.map((s) => (
              <Link key={s.id} href={`/students/${s.id}`}>
                <div className="group cursor-pointer rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-base font-bold text-gray-500 transition group-hover:bg-purple-100 group-hover:text-purple-600">
                      {s.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900">{s.name}</div>
                      {s.accountUserId ? (
                        <div className="mt-1 text-xs text-gray-500">Подключен к SecRep</div>
                      ) : (
                        <button
                          type="button"
                          className="mt-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInvite(s.id, s.name);
                          }}
                        >
                          Пригласить в SecRep
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                      <div className={`text-sm font-bold ${s.balance < 0 ? "text-red-500" : "text-gray-900"}`}>
                        {s.balance.toFixed(0)} ₽
                      </div>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openPaymentForm(s.id);
                        }}
                        aria-label="Пополнение"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                      <div className="text-sm font-semibold text-gray-700">Абонемента нет</div>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedStudentId(s.id);
                          setSubscriptionOpen(true);
                          setSubscriptionTitle("");
                          setSubscriptionLessons("8");
                          setSubscriptionPrice("");
                        }}
                        aria-label="Добавить абонемент"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex h-9 flex-1 items-center justify-center rounded-2xl bg-gray-50 text-xs font-semibold text-gray-700 ring-1 ring-gray-100 transition hover:bg-gray-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedStudentId(s.id);
                        setHomeworkOpen(true);
                        setHomeworkTab("current");
                        setHomeworkQuery("");
                        setHomeworkFrom("");
                        setHomeworkTo("");
                        loadPanelData(s.id);
                      }}
                    >
                      ДЗ
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-50 text-gray-700 ring-1 ring-gray-100 transition hover:bg-gray-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openStudentPanel(s.id, "payment");
                      }}
                      aria-label="Открыть"
                    >
                      →
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section ref={groupsRef} className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Группы</h2>
            <span className={badgeClassName}>0</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-auto rounded-full px-6"
            disabled
            aria-disabled="true"
          >
            Добавить группу
          </Button>
        </div>

        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <div className="mb-3 text-sm text-gray-600">Добавлять группы можно на тарифе Эксперт</div>
          <Button type="button" variant="secondary" className="w-auto rounded-full px-6">
            Стать Экспертом
          </Button>
        </div>
      </section>

      <Modal
        open={addStudentOpen}
        onClose={() => {
          setAddStudentOpen(false);
          resetCreateForm();
        }}
        title="Добавить ученика"
        side="right"
      >
        <div className="flex min-h-full flex-col gap-6">
          <div className="space-y-4">
            <Field label="Имя ученика" value={newStudentName} onChange={setNewStudentName} placeholder="Имя ученика" required />

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900">Способ оплаты</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_100px]">
                <Field label="Стоимость" value={paymentAmount} onChange={setPaymentAmount} placeholder="0" type="number" />
                <Field label="за" value={paymentEveryDays} onChange={setPaymentEveryDays} placeholder="60" type="number" />
                <label className="block">
                  <div className="mb-1 text-sm font-medium text-gray-900"> </div>
                  <select
                    value={paymentCurrency}
                    onChange={(e) => setPaymentCurrency(e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                    aria-label="Валюта"
                  >
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-medium text-gray-900"
                onClick={() => setExtraOpen((v) => !v)}
              >
                <span>Дополнительная информация</span>
                <span className="text-gray-400">{extraOpen ? "▾" : "▸"}</span>
              </button>

              {extraOpen ? (
                <div className="mt-4 space-y-4">
                  <Field label="Телефон" value={phone} onChange={setPhone} placeholder="+7" />
                  <Field label="Телеграм (или ник)" value={telegram} onChange={setTelegram} placeholder="@username" />
                  <Field label="Откуда познакомились" value={source} onChange={setSource} placeholder="Например: рекомендация" />
                  <TextAreaField label="Доп. информация" value={notes} onChange={setNotes} placeholder="Любые заметки про ученика" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="w-auto rounded-full px-6"
              onClick={() => {
                setAddStudentOpen(false);
                resetCreateForm();
              }}
            >
              Отменить
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newStudentName.trim()}
              className="w-auto rounded-full bg-gray-900 px-6 hover:bg-gray-800 focus:ring-gray-300"
            >
              {creating ? "Добавляем..." : "Добавить ученика"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={studentPanelOpen && !!selectedStudent}
        onClose={() => setStudentPanelOpen(false)}
        title={selectedStudent?.name ?? ""}
        side="right"
        widthClassName="max-w-[560px]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                studentPanelTab === "payment" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setStudentPanelTab("payment")}
            >
              Оплата
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                studentPanelTab === "info" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setStudentPanelTab("info")}
            >
              Инфо
            </button>
          </div>
        </div>

        {studentPanelTab === "payment" ? (
          <div className="mt-5 space-y-6">
            <div className="rounded-3xl bg-gray-50 p-6 ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500">На счет</div>
                  <div className="mt-2 text-4xl font-black tracking-tight text-gray-900">{selectedStudent?.balance?.toFixed(0)} ₽</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                    onClick={() => {
                      setTariffAmount(selectedStudent?.rateAmount ? String(selectedStudent.rateAmount) : "");
                      setTariffMinutes(String(selectedStudent?.rateMinutes || 60));
                      setTariffOpen(true);
                    }}
                    aria-label="Тариф"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                    onClick={() => openPaymentForm(selectedStudent!.id)}
                    aria-label="Оплата"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">{formatTariff(selectedStudent)}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Абонементы</div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                onClick={() => {
                  setSubscriptionOpen(true);
                  setSubscriptionTitle("");
                  setSubscriptionLessons("8");
                  setSubscriptionPrice("");
                }}
                aria-label="Добавить абонемент"
              >
                +
              </button>
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={subscriptionsShowFinished}
                onChange={(e) => {
                  setSubscriptionsShowFinished(e.target.checked);
                  if (selectedStudent) getStudentSubscriptions(selectedStudent.id, e.target.checked).then((r) => setSubscriptions(r.data ?? []));
                }}
              />
              <span>Показать завершенные</span>
            </label>

            {subscriptions.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">У ученика нет активных абонементов</div>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{sub.title}</div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        Осталось: {sub.lessonsLeft}/{sub.lessonsTotal}
                        {typeof sub.price === "number" ? ` • ${sub.price.toFixed(0)} ₽` : ""}
                      </div>
                    </div>
                    {sub.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        onClick={() => {
                          finishStudentSubscription(selectedStudent!.id, sub.id).then(() => loadPanelData(selectedStudent!.id));
                        }}
                      >
                        Завершить
                      </button>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">Завершён</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-900">История</div>

              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-600">Период</div>
                  <input
                    type="date"
                    value={eventsFrom}
                    onChange={(e) => setEventsFrom(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-600"> </div>
                  <input
                    type="date"
                    value={eventsTo}
                    onChange={(e) => setEventsTo(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 w-auto rounded-xl px-4"
                  onClick={() => selectedStudent && getStudentBalanceEvents(selectedStudent.id, { from: eventsFrom || undefined, to: eventsTo || undefined }).then((r) => setBalanceEvents(r.data ?? []))}
                >
                  Применить
                </Button>
              </div>

              {balanceEvents.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">Событий нет</div>
              ) : (
                <div className="space-y-2">
                  {balanceEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">{new Date(ev.happenedAt).toLocaleString()}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {ev.type === "TOP_UP" ? "Пополнен счёт" : "Изменение"}
                        </div>
                        <div className="mt-1 text-xs text-emerald-600">+{Number(ev.amount).toFixed(0)} ₽</div>
                        {ev.note ? <div className="mt-1 text-xs text-gray-500">{ev.note}</div> : null}
                      </div>
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        onClick={() => selectedStudent && deleteStudentBalanceEvent(selectedStudent.id, ev.id).then(() => loadPanelData(selectedStudent.id))}
                        aria-label="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-gray-900">Имя</div>
              <input
                value={selectedStudent?.name ?? ""}
                onChange={(e) => {
                  if (!selectedStudent) return;
                  setStudents((prev) => prev.map((x) => (x.id === selectedStudent.id ? { ...x, name: e.target.value } : x)));
                }}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-medium text-gray-900">Контакт</div>
              <input
                value={selectedStudent?.contact ?? ""}
                onChange={(e) => {
                  if (!selectedStudent) return;
                  setStudents((prev) => prev.map((x) => (x.id === selectedStudent.id ? { ...x, contact: e.target.value } : x)));
                }}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-medium text-gray-900">Заметки</div>
              <textarea
                value={selectedStudent?.notes ?? ""}
                onChange={(e) => {
                  if (!selectedStudent) return;
                  setStudents((prev) => prev.map((x) => (x.id === selectedStudent.id ? { ...x, notes: e.target.value } : x)));
                }}
                className="min-h-32 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              />
            </label>

            <Button
              type="button"
              className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
              onClick={async () => {
                if (!selectedStudent) return;
                setError("");
                try {
                  await updateStudent(selectedStudent.id, {
                    name: selectedStudent.name,
                    contact: selectedStudent.contact ?? "",
                    notes: selectedStudent.notes ?? "",
                  });
                  await load();
                } catch (e) {
                  setError(getApiErrorMessage(e, "Не удалось сохранить"));
                }
              }}
            >
              Сохранить
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={paymentOpen && !!selectedStudent} onClose={() => setPaymentOpen(false)} title="Оплата от ученика" side="right">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">{selectedStudent?.name}</div>
            </div>
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              На счету: {selectedStudent?.balance?.toFixed(0)} ₽
            </div>
          </div>

          <div className="grid grid-cols-[1fr_90px_1fr_1fr] items-end gap-2">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-gray-900">Сумма</div>
              <input
                value={paymentAmountRub}
                onChange={(e) => setPaymentAmountRub(e.target.value)}
                type="number"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                placeholder="700"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-medium text-gray-900"> </div>
              <select className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none" disabled value="RUB">
                <option value="RUB">RUB</option>
              </select>
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-medium text-gray-900">Дата</div>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-medium text-gray-900">Время</div>
              <input
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">На какой кошелек зачислить</div>
            <div className="flex gap-2 overflow-auto pb-1">
              {wallets
                .filter((w) => !w.isArchived)
                .map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`min-w-[160px] rounded-2xl px-4 py-3 text-left ring-1 ${
                      paymentWalletId === w.id ? "bg-amber-50 ring-amber-200" : "bg-white ring-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => setPaymentWalletId(w.id)}
                  >
                    <div className="text-sm font-bold text-gray-900">{w.balance.toFixed(0)} ₽</div>
                    <div className="mt-1 text-xs text-gray-500">{w.name}</div>
                  </button>
                ))}
            </div>
          </div>

          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Примечание</div>
            <textarea
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="min-h-24 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              placeholder=""
            />
          </label>

          <Button
            type="button"
            className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
            disabled={paymentSubmitting || !paymentAmountRub.trim() || !paymentWalletId}
            onClick={submitPayment}
          >
            {paymentSubmitting ? "Сохраняем..." : "Пополнить"}
          </Button>
        </div>
      </Modal>

      <Modal open={tariffOpen && !!selectedStudent} onClose={() => setTariffOpen(false)} title="Тариф" side="right">
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Цена (₽)</div>
            <input
              value={tariffAmount}
              onChange={(e) => setTariffAmount(e.target.value)}
              type="number"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              placeholder="700"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Длительность (мин.)</div>
            <input
              value={tariffMinutes}
              onChange={(e) => setTariffMinutes(e.target.value)}
              type="number"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              placeholder="60"
            />
          </label>
          <Button
            type="button"
            className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
            disabled={tariffSaving || !tariffMinutes.trim()}
            onClick={submitTariff}
          >
            {tariffSaving ? "Сохраняем..." : "Сохранить"}
          </Button>
        </div>
      </Modal>

      <Modal open={subscriptionOpen && !!selectedStudent} onClose={() => setSubscriptionOpen(false)} title="Абонемент" side="right">
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Название</div>
            <input
              value={subscriptionTitle}
              onChange={(e) => setSubscriptionTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              placeholder="Абонемент"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Количество занятий</div>
            <input
              value={subscriptionLessons}
              onChange={(e) => setSubscriptionLessons(e.target.value)}
              type="number"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              placeholder="8"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Цена (₽)</div>
            <input
              value={subscriptionPrice}
              onChange={(e) => setSubscriptionPrice(e.target.value)}
              type="number"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              placeholder=""
            />
          </label>
          <Button
            type="button"
            className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
            disabled={subscriptionSaving || !subscriptionTitle.trim() || !subscriptionLessons.trim()}
            onClick={submitSubscription}
          >
            {subscriptionSaving ? "Сохраняем..." : "Создать"}
          </Button>
        </div>
      </Modal>

      <Modal open={homeworkOpen && !!selectedStudent} onClose={() => setHomeworkOpen(false)} title="Домашние задания" side="right" widthClassName="max-w-[560px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  homeworkTab === "current" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => setHomeworkTab("current")}
              >
                Текущие
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  homeworkTab === "templates" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => setHomeworkTab("templates")}
              >
                Шаблоны
              </button>
            </div>

            {homeworkTab === "templates" ? (
              <Button type="button" className="w-auto rounded-full bg-gray-900 px-5 hover:bg-gray-800" onClick={() => setTemplateAddOpen(true)}>
                Добавить шаблон
              </Button>
            ) : (
              <Button type="button" className="w-auto rounded-full bg-gray-900 px-5 hover:bg-gray-800" onClick={() => setHomeworkAddOpen(true)}>
                Добавить ДЗ
              </Button>
            )}
          </div>

          <div className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-gray-100">
            <span className="text-gray-300">🔎</span>
            <input
              value={homeworkQuery}
              onChange={(e) => setHomeworkQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="Поиск"
            />
          </div>

          {homeworkTab === "current" ? (
            <>
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-600">Период</div>
                  <input
                    type="date"
                    value={homeworkFrom}
                    onChange={(e) => setHomeworkFrom(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-600"> </div>
                  <input
                    type="date"
                    value={homeworkTo}
                    onChange={(e) => setHomeworkTo(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 w-auto rounded-xl px-4"
                  onClick={() =>
                    selectedStudent &&
                    getStudentHomeworkTasks(selectedStudent.id, {
                      status: "ASSIGNED",
                      from: homeworkFrom || undefined,
                      to: homeworkTo || undefined,
                    }).then((r) => setHomeworkTasks(r.data ?? []))
                  }
                >
                  Применить
                </Button>
              </div>

              {homeworkTasks.filter((t) => {
                const q = homeworkQuery.trim().toLowerCase();
                if (!q) return true;
                return String(t.title ?? "").toLowerCase().includes(q) || String(t.text ?? "").toLowerCase().includes(q);
              }).length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">
                  За выбранный промежуток времени домашних заданий нет
                </div>
              ) : (
                <div className="space-y-2">
                  {homeworkTasks
                    .filter((t) => {
                      const q = homeworkQuery.trim().toLowerCase();
                      if (!q) return true;
                      return String(t.title ?? "").toLowerCase().includes(q) || String(t.text ?? "").toLowerCase().includes(q);
                    })
                    .map((t) => (
                      <div key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">{t.title}</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{t.text}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                              onClick={() => selectedStudent && updateStudentHomeworkTask(selectedStudent.id, t.id, { status: "DONE" }).then(() => loadPanelData(selectedStudent.id))}
                            >
                              Готово
                            </button>
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                              onClick={() => selectedStudent && deleteStudentHomeworkTask(selectedStudent.id, t.id).then(() => loadPanelData(selectedStudent.id))}
                              aria-label="Удалить"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            <>
              {homeworkTemplates.filter((t) => {
                const q = homeworkQuery.trim().toLowerCase();
                if (!q) return true;
                return String(t.title ?? "").toLowerCase().includes(q) || String(t.text ?? "").toLowerCase().includes(q);
              }).length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">Шаблонов нет</div>
              ) : (
                <div className="space-y-2">
                  {homeworkTemplates
                    .filter((t) => {
                      const q = homeworkQuery.trim().toLowerCase();
                      if (!q) return true;
                      return String(t.title ?? "").toLowerCase().includes(q) || String(t.text ?? "").toLowerCase().includes(q);
                    })
                    .map((t) => (
                      <div key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">{t.title}</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{t.text}</div>
                          </div>
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => deleteHomeworkTemplate(t.id).then(() => listHomeworkTemplates().then((r) => setHomeworkTemplates(r.data ?? [])))}
                            aria-label="Удалить"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal open={homeworkAddOpen && !!selectedStudent} onClose={() => setHomeworkAddOpen(false)} title="Добавить ДЗ" side="right">
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Заголовок</div>
            <input
              value={homeworkTitle}
              onChange={(e) => setHomeworkTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              placeholder=""
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Шаблон</div>
            <select
              value={homeworkTemplateId}
              onChange={(e) => {
                const id = e.target.value;
                setHomeworkTemplateId(id);
                const tpl = homeworkTemplates.find((t) => t.id === id);
                if (tpl) {
                  if (!homeworkTitle.trim()) setHomeworkTitle(String(tpl.title));
                  setHomeworkText(String(tpl.text));
                }
              }}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">—</option>
              {homeworkTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Текст</div>
            <textarea
              value={homeworkText}
              onChange={(e) => setHomeworkText(e.target.value)}
              className="min-h-32 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
          <Button
            type="button"
            className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
            disabled={homeworkSaving || !homeworkTitle.trim() || !homeworkText.trim()}
            onClick={submitHomeworkTask}
          >
            {homeworkSaving ? "Сохраняем..." : "Добавить"}
          </Button>
        </div>
      </Modal>

      <Modal open={templateAddOpen} onClose={() => setTemplateAddOpen(false)} title="Добавить шаблон" side="right">
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Название</div>
            <input
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium text-gray-900">Текст</div>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="min-h-32 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
          <Button
            type="button"
            className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
            disabled={templateSaving || !templateTitle.trim() || !templateText.trim()}
            onClick={submitHomeworkTemplate}
          >
            {templateSaving ? "Сохраняем..." : "Создать"}
          </Button>
        </div>
      </Modal>

      {toastText ? (
        <div className="fixed bottom-6 left-1/2 z-[80] w-[calc(100%-32px)] max-w-xl -translate-x-1/2">
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900 shadow-lg ring-1 ring-emerald-100">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                ✓
              </div>
              <div className="text-sm">{toastText}</div>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-emerald-700 hover:bg-emerald-100"
              onClick={() => setToastText("")}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
