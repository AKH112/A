"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { acceptStudentInvite, getStudentInvite } from "@/services/invites.api";
import { requestEmailOtp, verifyEmailOtp } from "@/services/authOtp.api";
import { getApiErrorMessage } from "@/services/apiError";

type InvitePayload = {
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  expired: boolean;
  teacher: { id: string; email: string; name: string | null };
  student: { id: string; name: string } | null;
};

type Stage = "email" | "otp" | "done";

const Stepper = () => (
  <div className="flex items-center justify-center gap-4">
    <div className="h-2 w-24 rounded-full bg-gray-900" />
    <div className="h-2 w-24 rounded-full bg-gray-200" />
    <div className="h-2 w-24 rounded-full bg-gray-200" />
  </div>
);

const OtpInput = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) => {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((d, idx) => (
        <input
          key={idx}
          value={d}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            const nextDigit = raw.replace(/\D/g, "").slice(-1);
            const next = digits.map((x, i) => (i === idx ? nextDigit : x)).join("");
            onChange(next);
            const nextEl = e.currentTarget.nextElementSibling as HTMLInputElement | null;
            if (nextDigit && nextEl) nextEl.focus();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Backspace") return;
            if (digits[idx]) return;
            const prevEl = (e.currentTarget.previousElementSibling as HTMLInputElement | null) ?? null;
            if (prevEl) prevEl.focus();
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Цифра ${idx + 1}`}
          className="h-12 w-12 rounded-2xl border border-gray-200 bg-white text-center text-lg font-semibold text-gray-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
        />
      ))}
    </div>
  );
};

export default function InviteClient() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";

  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("email");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [debugCode, setDebugCode] = useState<string>("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    window.localStorage.setItem("invite:pending", token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setError("");
    getStudentInvite(token)
      .then((res) => {
        if (!alive) return;
        setInvite(res.data);
      })
      .catch(() => {
        if (!alive) return;
        setError("Приглашение не найдено или устарело");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const teacherLabel = invite?.teacher?.name?.trim() || invite?.teacher?.email || "Учитель";

  useEffect(() => {
    if (stage !== "otp" || resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn, stage]);

  const requestOtp = async () => {
    setPending(true);
    setError("");
    setDebugCode("");
    try {
      const res = await requestEmailOtp(email.trim());
      const after = Number(res.data?.resendAfterSec ?? 60);
      setResendIn(Number.isFinite(after) ? after : 60);
      const dbg = typeof res.data?.debugCode === "string" ? res.data.debugCode : "";
      if (dbg) setDebugCode(dbg);
      setStage("otp");
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось отправить одноразовый пароль"));
    } finally {
      setPending(false);
    }
  };

  const verifyOtpAndAccept = async () => {
    setPending(true);
    setError("");
    try {
      await verifyEmailOtp(email.trim(), otp);
      await acceptStudentInvite(token);
      window.localStorage.removeItem("invite:pending");
      window.localStorage.setItem("sidebar:role", "Ученик");
      setStage("done");
      router.replace("/teachers");
    } catch (e) {
      setError(getApiErrorMessage(e, "Неверный код или он устарел"));
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-6 text-gray-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Stepper />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-fuchsia-200 to-pink-200 p-10">
            <div className="mb-3 text-sm font-semibold text-gray-900">{teacherLabel} приглашает тебя в SecRep</div>
            <div className="text-sm font-semibold text-gray-900">Что можно делать в SecRep:</div>
            <ul className="mt-4 space-y-3 text-sm text-gray-800">
              <li className="flex items-center gap-2">
                <span className="text-purple-700">✦</span>Получать напоминания о занятиях и ДЗ
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-700">✦</span>Следить за расписанием
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-700">✦</span>Записываться на занятия
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-700">✦</span>И многое другое…
              </li>
            </ul>

            <div className="absolute bottom-8 right-8 h-20 w-20 rounded-full bg-white/50" />
          </div>

          <div className="rounded-3xl bg-white p-10 shadow-sm ring-1 ring-gray-100">
            <div className="mb-6 text-center text-3xl font-black tracking-tight">SecRep</div>

            {error ? <div className="mb-4 rounded-2xl bg-red-100 p-3 text-sm text-red-700">{error}</div> : null}

            {invite?.expired ? (
              <div className="text-sm text-gray-600">Ссылка устарела. Попросите учителя отправить новое приглашение.</div>
            ) : invite?.acceptedAt ? (
              <div className="text-sm text-gray-600">Это приглашение уже принято.</div>
            ) : stage === "otp" ? (
              <>
                <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-600">
                  <div className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-800">{email.trim()}</div>
                  <button
                    type="button"
                    className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 hover:bg-gray-200"
                    onClick={() => {
                      setStage("email");
                      setOtp("");
                      setError("");
                      setDebugCode("");
                      setResendIn(0);
                    }}
                    aria-label="Изменить email"
                  >
                    ✎
                  </button>
                </div>

                <div className="mb-6 text-center">
                  <div className="text-sm font-medium text-gray-900">Отправили одноразовый пароль</div>
                </div>

                <div className="mb-2 text-center text-sm font-semibold text-gray-900">Введите шестизначный пароль</div>
                <div className="mb-6 text-center text-xs text-gray-500">Действителен в течение 15 минут</div>

                <OtpInput value={otp} onChange={(c) => setOtp(c.slice(0, 6))} disabled={pending} />

                {debugCode ? <div className="mt-3 text-center text-xs text-gray-500">Dev-код: {debugCode}</div> : null}

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    className={`text-sm font-medium ${resendIn > 0 ? "text-gray-400" : "text-purple-600 hover:text-purple-700"}`}
                    disabled={resendIn > 0 || pending}
                    onClick={requestOtp}
                  >
                    Отправить ещё раз {resendIn > 0 ? `(${resendIn}с)` : ""}
                  </button>
                </div>

                <div className="mt-6">
                  <Button
                    type="button"
                    className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
                    disabled={pending || otp.trim().length !== 6}
                    onClick={verifyOtpAndAccept}
                  >
                    {pending ? "Входим..." : "Войти"}
                  </Button>
                </div>

                <div className="mt-4 text-center text-xs text-gray-400">
                  Нажимая Войти, вы подтверждаете, что ознакомились с{" "}
                  <span className="underline underline-offset-2">Политикой конфиденциальности</span>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-gray-900">Почта</div>
                    <input
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      type="email"
                    />
                  </label>

                  <label className="flex items-start gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    <span>
                      Принимаю условия <span className="underline underline-offset-2">Пользовательского соглашения</span> и{" "}
                      <span className="underline underline-offset-2">Политики обработки данных</span>
                    </span>
                  </label>
                </div>

                <div className="mt-6 space-y-4">
                  <Button
                    type="button"
                    className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
                    disabled={pending || !acceptedTerms || !email.trim()}
                    onClick={requestOtp}
                  >
                    {pending ? "Отправляем..." : "Создать аккаунт"}
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    Уже есть аккаунт?{" "}
                    <button
                      type="button"
                      className="font-medium text-purple-600 hover:underline"
                      onClick={requestOtp}
                      disabled={pending || !email.trim()}
                    >
                      Войти
                    </button>
                  </div>

                  <div className="text-center text-sm text-gray-400">или</div>

                  <button type="button" className="w-full rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white opacity-60" disabled>
                    Войти через Telegram ✈️
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
