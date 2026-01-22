"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Lesson } from "@/types/lesson";
import { payLesson } from "@/services/lessons.api";
import { createHomework, getHomework } from "@/services/homework.api";

type LessonDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
};

export const LessonDetailsModal = ({
  isOpen,
  onClose,
  lesson,
  onComplete,
  onDelete,
  onReload,
}: LessonDetailsModalProps) => {
  if (!lesson) return null;

  const start = parseISO(lesson.startTime);
  const end = parseISO(lesson.endTime);

  const title = lesson.type === "LESSON" ? lesson.student?.name ?? "Урок" : "Личное";
  const [payRub, setPayRub] = useState<number>(0);
  const [homeworkText, setHomeworkText] = useState<string>("");
  const [homeworkSaved, setHomeworkSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);

  const priceRub = useMemo(() => {
    if (!lesson.price) return null;
    return Math.round(lesson.price / 100);
  }, [lesson.price]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setHomeworkSaved(false);
    setPayRub(priceRub ?? 0);

    if (lesson.status !== "COMPLETED") {
      setHomeworkText("");
      return;
    }

    getHomework(lesson.id)
      .then((res) => {
        setHomeworkText(res.data?.text ?? "");
      })
      .catch(() => {
        setHomeworkText("");
      });
  }, [isOpen, lesson.id, lesson.status, priceRub]);

  const showPay = lesson.status === "COMPLETED" && !lesson.isPaid && typeof lesson.price === "number";
  const showHomework = lesson.status === "COMPLETED";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="text-sm text-gray-700">
          <div>
            {format(start, "dd.MM.yyyy")} {format(start, "HH:mm")}–{format(end, "HH:mm")}
          </div>
          <div>Статус: {lesson.status}</div>
          {lesson.type === "LESSON" && priceRub !== null && (
            <div>
              Цена: {priceRub} ₽ • Оплата: {lesson.isPaid ? "да" : "нет"}
            </div>
          )}
        </div>

        {error && <div className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>}
        {homeworkSaved && <div className="rounded bg-green-100 p-3 text-sm text-green-800">Сохранено</div>}

        {showPay && (
          <div className="space-y-2 rounded border p-3">
            <div className="text-sm font-medium">Оплата</div>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              type="number"
              value={payRub}
              onChange={(e) => setPayRub(Number(e.target.value))}
              min={0}
            />
            <Button
              type="button"
              onClick={async () => {
                setError("");
                setPending(true);
                try {
                  const amount = Math.round(Number(payRub) * 100);
                  if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid");
                  await payLesson(lesson.id, amount);
                  await onReload();
                  onClose();
                } catch {
                  setError("Не удалось подтвердить оплату");
                } finally {
                  setPending(false);
                }
              }}
              disabled={pending}
            >
              Подтвердить оплату
            </Button>
          </div>
        )}

        {showHomework && (
          <div className="space-y-2 rounded border p-3">
            <div className="text-sm font-medium">Домашнее задание</div>
            <textarea
              className="min-h-28 w-full resize-y rounded-md border border-gray-300 px-3 py-2"
              value={homeworkText}
              onChange={(e) => setHomeworkText(e.target.value)}
            />
            <Button
              type="button"
              onClick={async () => {
                setError("");
                setPending(true);
                try {
                  await createHomework(lesson.id, homeworkText);
                  setHomeworkSaved(true);
                } catch {
                  setError("Не удалось сохранить ДЗ");
                } finally {
                  setPending(false);
                }
              }}
              disabled={pending}
            >
              Сохранить ДЗ
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={async () => {
              setError("");
              setPending(true);
              try {
                await onComplete(lesson.id);
                await onReload();
                onClose();
              } catch {
                setError("Не удалось провести урок");
              } finally {
                setPending(false);
              }
            }}
            disabled={pending || lesson.status === "COMPLETED"}
          >
            Проведен
          </Button>
          <Button
            variant="danger"
            type="button"
            onClick={async () => {
              setError("");
              setPending(true);
              try {
                await onDelete(lesson.id);
                await onReload();
                onClose();
              } catch {
                setError("Не удалось удалить");
              } finally {
                setPending(false);
              }
            }}
            disabled={pending}
          >
            Удалить
          </Button>
        </div>
      </div>
    </Modal>
  );
};
