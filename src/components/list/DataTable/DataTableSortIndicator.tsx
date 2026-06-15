import type { TableSortOrder } from "../../ui/table/SortableHeaderCell";

export function DataTableSortIndicator({
  active,
  order,
}: {
  active: boolean;
  order?: TableSortOrder;
}) {
  const activeClassName = "fill-brand-500 dark:fill-brand-400";
  const inactiveClassName = "fill-gray-300 dark:fill-gray-700";

  return (
    <span className="flex flex-col gap-0.5" aria-hidden="true">
      <svg
        className={active && order === "asc" ? activeClassName : inactiveClassName}
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M4.40962 0.585167C4.21057 0.300808 3.78943 0.300807 3.59038 0.585166L1.05071 4.21327C0.81874 4.54466 1.05582 5 1.46033 5H6.53967C6.94418 5 7.18126 4.54466 6.94929 4.21327L4.40962 0.585167Z" />
      </svg>
      <svg
        className={active && order === "desc" ? activeClassName : inactiveClassName}
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M4.40962 4.41483C4.21057 4.69919 3.78943 4.69919 3.59038 4.41483L1.05071 0.786732C0.81874 0.455343 1.05582 0 1.46033 0H6.53967C6.94418 0 7.18126 0.455342 6.94929 0.786731L4.40962 4.41483Z" />
      </svg>
    </span>
  );
}
