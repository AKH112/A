"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/services/apiError";

type Stage = "email" | "otp";

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

export default function LoginClient() {
  const { requestOtp, verifyOtp } = useAuth();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const emailFromQuery = searchParams.get("email") ?? "";
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [stage, setStage] = useState<Stage>("email");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (inviteToken) window.localStorage.setItem("invite:pending", inviteToken);
  }, [inviteToken]);

  useEffect(() => {
    if (emailFromQuery && !email) setEmail(emailFromQuery);
  }, [email, emailFromQuery]);

  const registerHref = useMemo(() => {
    if (!inviteToken) return "/register";
    const qp = new URLSearchParams();
    qp.set("invite", inviteToken);
    if (email) qp.set("email", email);
    return `/register?${qp.toString()}`;
  }, [email, inviteToken]);

  useEffect(() => {
    if (stage !== "otp" || resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn, stage]);

  const handleRequest = async () => {
    setPending(true);
    setError("");
    try {
      const data = await requestOtp(email.trim());
      const after = Number(data?.resendAfterSec ?? 60);
      setResendIn(Number.isFinite(after) ? after : 60);
      setStage("otp");
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось отправить одноразовый пароль"));
    } finally {
      setPending(false);
    }
  };

  const handleVerify = async () => {
    setPending(true);
    setError("");
    try {
      await verifyOtp(email.trim(), otp);
    } catch (e) {
      setError(getApiErrorMessage(e, "Неверный код или он устарел"));
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full items-center justify-center bg-white p-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <h1 className="mb-2 text-3xl font-bold">SecRep</h1>
          <h2 className="mb-8 text-xl text-gray-600">Вход в систему</h2>

          {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}

          {stage === "otp" ? (
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

              <div className="mt-6 text-center">
                <button
                  type="button"
                  className={`text-sm font-medium ${resendIn > 0 ? "text-gray-400" : "text-purple-600 hover:text-purple-700"}`}
                  disabled={resendIn > 0 || pending}
                  onClick={handleRequest}
                >
                  Отправить ещё раз {resendIn > 0 ? `(${resendIn}с)` : ""}
                </button>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  className="rounded-full bg-gray-900 hover:bg-gray-800 focus:ring-gray-300"
                  disabled={pending || otp.trim().length !== 6}
                  onClick={handleVerify}
                >
                  {pending ? "Входим..." : "Войти"}
                </Button>
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
                  onClick={handleRequest}
                >
                  {pending ? "Отправляем..." : "Войти"}
                </Button>

                <p className="mt-6 text-sm text-gray-600">
                  Нет аккаунта?{" "}
                  <Link href={registerHref} className="text-purple-600 hover:underline">
                    Регистрация
                  </Link>
                </p>
              </div>
            </>
          )}

          <button
            className="mt-3 w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            type="button"
            disabled
          >
            Войти через Telegram
          </button>
        </div>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-[#7c3aed] p-12 text-white lg:flex">
        <div className="z-10 max-w-xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Помогаем репетиторам справляться с рутиной</h2>
        </div>
        <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-white opacity-10" />
        <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-white opacity-10" />
      </div>
    </div>
  );
}
