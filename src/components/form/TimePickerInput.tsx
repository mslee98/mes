import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
} from "react";
import { createPortal } from "react-dom";
import Label from "./Label";
import { TimeIcon } from "../../icons";
import {
  formatKoreanTimeLabel,
  twelveToTwentyFour,
  twentyFourToParts,
} from "../../lib/time12h24h";

type TimePickerInputProps = {
  id: string;
  label?: string;
  /** 24시간 "HH:mm" (HTML time과 동일) */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  /**
   * 값이 커질 때마다(예: 날짜 선택 직후 부모에서 증가) 시간 선택 패널을 연다.
   * `0`은 부팅·초기화용으로 무시한다.
   */
  autoOpenSignal?: number;
  /**
   * `onSelect`: 오전/오후·시·분을 바꿀 때마다 즉시 `onChange` 반영. 「저장」은 현재 패널 값을 한 번 더 확정(빈 값+저장만으로도 반영).
   * `onSave`: 패널 안에서는 임시 선택만 하고 「저장」에서만 `onChange` 반영.
   * @default "onSelect"
   */
  commitMode?: "onSelect" | "onSave";
  /**
   * `commitMode="onSelect"`일 때만 적용. 분 `<select>` 변경 후 패널을 닫습니다.
   * @default true
   */
  closeOnMinuteSelect?: boolean;
};

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
const HOUR12_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const TimePickerInput: FC<TimePickerInputProps> = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
  commitMode = "onSelect",
  closeOnMinuteSelect = true,
  autoOpenSignal,
}) => {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** 패널을 열었을 때의 값 — 취소 시(즉시 반영 모드) 되돌리기용 */
  const valueSnapshotRef = useRef("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);

  const syncDraftFromValue = useCallback(() => {
    const p = twentyFourToParts(value);
    if (p) {
      setPeriod(p.period);
      setHour12(p.hour12);
      setMinute(p.minute);
    } else {
      setPeriod("AM");
      setHour12(9);
      setMinute(0);
    }
  }, [value]);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelWidth = 288;
    let left = r.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - panelWidth - 8);
    }
    setPos({
      top: r.bottom + 6,
      left,
      width: Math.max(r.width, panelWidth),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onScroll = () => updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const openPanel = useCallback(() => {
    if (disabled) return;
    valueSnapshotRef.current = value.trim();
    syncDraftFromValue();
    setOpen(true);
    queueMicrotask(() => updatePanelPosition());
  }, [disabled, value, syncDraftFromValue, updatePanelPosition]);

  useEffect(() => {
    if (autoOpenSignal === undefined || autoOpenSignal <= 0) return;
    if (disabled) return;
    const t = window.setTimeout(() => {
      openPanel();
    }, 0);
    return () => window.clearTimeout(t);
    // 날짜 선택 등으로 signal만 바뀔 때 한 번 열기 — value 변화마다 재실행하면 안 됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenSignal, disabled]);

  const handleSave = () => {
    /** 빈 값에서 패널만 연 뒤 조작 없이 저장해도 기본 시안(오전 9:00)이 반영되도록 항상 확정한다. */
    onChange(twelveToTwentyFour(period, hour12, minute));
    setOpen(false);
  };

  const handleCancel = () => {
    const snap = valueSnapshotRef.current;
    if (commitMode === "onSelect") {
      onChange(snap);
      const p = twentyFourToParts(snap);
      if (p) {
        setPeriod(p.period);
        setHour12(p.hour12);
        setMinute(p.minute);
      } else {
        setPeriod("AM");
        setHour12(9);
        setMinute(0);
      }
    } else {
      syncDraftFromValue();
    }
    setOpen(false);
  };

  const display = value.trim() ? formatKoreanTimeLabel(value) : "시간 선택";

  const triggerClass = compact
    ? "h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 pr-9 text-left text-theme-xs text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
    : "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-left text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 disabled:cursor-not-allowed disabled:opacity-60";

  const panel = open ? (
    <div
      ref={panelRef}
      id={listboxId}
      role="dialog"
      aria-modal="false"
      aria-label="시간 선택"
      className="fixed z-[100000] rounded-xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxWidth: "min(100vw - 16px, 320px)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          handleCancel();
        }
      }}
    >
      <div className="mb-3 flex rounded-lg bg-gray-100 p-0.5 dark:bg-white/10">
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-theme-xs font-medium transition-colors ${
            period === "AM"
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
              : "text-gray-600 dark:text-gray-400"
          }`}
          onClick={() => {
            setPeriod("AM");
            if (commitMode === "onSelect") {
              onChange(twelveToTwentyFour("AM", hour12, minute));
            }
          }}
        >
          오전
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-theme-xs font-medium transition-colors ${
            period === "PM"
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
              : "text-gray-600 dark:text-gray-400"
          }`}
          onClick={() => {
            setPeriod("PM");
            if (commitMode === "onSelect") {
              onChange(twelveToTwentyFour("PM", hour12, minute));
            }
          }}
        >
          오후
        </button>
      </div>

      <p className="mb-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        시 (1–12)
      </p>
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {HOUR12_OPTIONS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => {
              setHour12(h);
              if (commitMode === "onSelect") {
                onChange(twelveToTwentyFour(period, h, minute));
              }
            }}
            className={`rounded-lg py-2 text-theme-xs font-medium transition-colors ${
              hour12 === h
                ? "bg-brand-500 text-white dark:bg-brand-600"
                : "bg-gray-50 text-gray-800 hover:bg-gray-100 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      <label
        htmlFor={`${id}-minute-select`}
        className="mb-1.5 block text-theme-xs font-medium text-gray-500 dark:text-gray-400"
      >
        분 (0–59)
      </label>
      <select
        id={`${id}-minute-select`}
        value={minute}
        onChange={(e) => {
          const n = Number(e.target.value);
          setMinute(n);
          if (commitMode === "onSelect") {
            onChange(twelveToTwentyFour(period, hour12, n));
            if (closeOnMinuteSelect) setOpen(false);
          }
        }}
        className="mb-4 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-theme-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
      >
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}분
          </option>
        ))}
      </select>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300"
          onClick={handleCancel}
        >
          취소
        </button>
        <button
          type="button"
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-theme-xs font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
          onClick={handleSave}
        >
          저장
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className={label ? "relative mt-1" : "relative"}>
        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? listboxId : undefined}
          className={`${triggerClass} ${!value.trim() ? "text-gray-400 dark:text-gray-500" : ""}`}
          onClick={() => (open ? setOpen(false) : openPanel())}
        >
          {display}
        </button>
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 ${
            compact ? "right-2" : "right-3"
          }`}
        >
          <TimeIcon className={compact ? "size-5" : "size-6"} />
        </span>
      </div>
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
};

export default TimePickerInput;
