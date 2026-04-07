import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "react-router";
import Input from "../form/input/InputField";

function SearchMagnifierIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="mr-2 h-3.5 w-3.5"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
      />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`ml-1.5 h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      />
    </svg>
  );
}

/** 발주·납품 목록과 동일한 보조(아웃라인) 툴바 버튼 */
export const dataListOutlineButtonClassName =
  "flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-brand-600 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700 md:w-auto";

export const dataListSearchInputClassName =
  "!border-gray-200 !bg-transparent !py-2.5 !pl-12 !text-gray-800 !placeholder:text-gray-400 focus:!border-brand-300 focus:!ring-brand-500/10 dark:!border-gray-800 dark:!bg-white/[0.03] dark:!text-white/90 dark:!placeholder:text-white/30 dark:focus:!border-brand-800 !text-sm";

type DataListSearchInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
} & Omit<ComponentPropsWithoutRef<typeof Input>, "id" | "value" | "onChange" | "placeholder" | "className">;

/**
 * 목록 상단 키워드 입력 — 돋보기 + 발주 목록과 동일한 보더/다크 스타일
 */
export function DataListSearchInput({
  id,
  value,
  onChange,
  placeholder,
  ...rest
}: DataListSearchInputProps) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        검색
      </label>
      <div className="relative w-full">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <SearchMagnifierIcon />
        </span>
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={dataListSearchInputClassName}
          {...rest}
        />
      </div>
    </>
  );
}

type DataListSearchOptionsButtonProps = {
  open: boolean;
  onToggle: () => void;
};

export function DataListSearchOptionsButton({ open, onToggle }: DataListSearchOptionsButtonProps) {
  return (
    <button type="button" onClick={onToggle} className={dataListOutlineButtonClassName}>
      <span>검색 옵션</span>
      <ChevronDownIcon open={open} />
    </button>
  );
}

type DataListPrimaryActionButtonProps = {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
};

/** 목록 주요 등록/추가 — + 아이콘 + 발주「발주 추가」와 동일 스타일 */
export function DataListPrimaryActionButton({
  onClick,
  children,
  disabled,
}: DataListPrimaryActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
    >
      <PlusIcon />
      {children}
    </button>
  );
}

type DataListPrimaryActionLinkProps = {
  to: string;
  children: ReactNode;
};

export function DataListPrimaryActionLink({ to, children }: DataListPrimaryActionLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
    >
      <PlusIcon />
      {children}
    </Link>
  );
}

type ListPageToolbarRowProps = {
  search: ReactNode;
  actions: ReactNode;
};

/**
 * 목록 카드 상단 1행: 왼쪽 검색(md 1/2), 오른쪽 CTA·검색 옵션 등
 */
export function ListPageToolbarRow({ search, actions }: ListPageToolbarRowProps) {
  return (
    <div className="flex w-full flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="w-full md:w-1/2">{search}</div>
      <div className="flex flex-shrink-0 flex-col items-stretch justify-end gap-2 md:flex-row md:items-center md:gap-3">
        {actions}
      </div>
    </div>
  );
}
