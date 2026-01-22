"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { createTelegramLinkToken, disconnectTelegram, getTelegramStatus, sendTelegramTest } from "@/services/telegram.api";

type TelegramStatus = {
  enabled: boolean;
  connected: boolean;
  telegramChatId: string | null;
};

export function TelegramConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [actionMsg, setActionMsg] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef<number | null>(null);

  const canActions = status?.enabled !== false;
  const connected = Boolean(status?.connected);

  const headline = useMemo(() => {
    if (!status) return "Подключение Telegram-бота";
    if (!status.enabled) return "Telegram-бот отключен на сервере";
    if (connected) return "Telegram-бот подключен";
    return "Подключение Telegram-бота";
  }, [connected, status]);

  const refresh = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await getTelegramStatus();
      setStatus(data);
    } catch {
      setErr("Не удалось получить статус Telegram");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setActionMsg("");
    void refresh();
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, []);

  const startPolling = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    const startedAt = Date.now();
    pollRef.current = window.setInterval(async () => {
      if (Date.now() - startedAt > 60_000) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setConnecting(false);
        return;
      }
      try {
        const { data } = await getTelegramStatus();
        setStatus(data);
        if (data?.connected) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setConnecting(false);
          setActionMsg("Готово. Telegram подключен.");
        }
      } catch {}
    }, 2000);
  };

  const onConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    setActionMsg("");
    setErr("");
    try {
      const { data } = await createTelegramLinkToken();
      const url = data?.url as string | null | undefined;
      if (!url) {
        setErr("Не задан TELEGRAM_BOT_USERNAME на сервере. Нужна ссылка вида https://t.me/<бот>?start=...");
        setConnecting(false);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      setActionMsg("Открыл Telegram. Нажмите Start в чате, затем вернитесь сюда.");
      startPolling();
    } catch {
      setErr("Не удалось создать ссылку для подключения");
      setConnecting(false);
    }
  };

  const onDisconnect = async () => {
    setErr("");
    setActionMsg("");
    try {
      await disconnectTelegram();
      await refresh();
      setActionMsg("Ок. Telegram отключен.");
    } catch {
      setErr("Не удалось отключить Telegram");
    }
  };

  const onTest = async () => {
    setErr("");
    setActionMsg("");
    try {
      await sendTelegramTest("Тест: уведомления SecRep работают.");
      setActionMsg("Тестовое сообщение отправлено.");
    } catch {
      setErr("Не удалось отправить тестовое сообщение");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={headline}>
      <div className="space-y-4">
        {!canActions && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            На backend не задан TELEGRAM_BOT_TOKEN. Добавьте переменные окружения и перезапустите сервер.
          </div>
        )}

        {loading && <div className="text-sm text-gray-500">Загрузка...</div>}
        {!!err && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{err}</div>}
        {!!actionMsg && <div className="rounded-2xl bg-black p-4 text-sm text-white">{actionMsg}</div>}

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Что дает бот</div>
          <div className="mt-2 space-y-2 text-sm text-gray-600">
            <div>• напоминания о занятиях</div>
            <div>• уведомления о домашних заданиях</div>
            <div>• уведомления об оплате</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={onConnect}
              disabled={!canActions || connecting}
              className="inline-flex w-full items-center justify-center rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {connecting ? "Ожидаю подтверждение..." : "Активировать бота"}
            </button>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onTest}
                disabled={!canActions}
                className="inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60"
              >
                Отправить тест
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                className="inline-flex w-full items-center justify-center rounded-full bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200"
              >
                Отключить
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

