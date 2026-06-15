import { useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";
import Checkbox from "../../components/form/input/Checkbox";
import {
  CollapsibleDataTable,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DataTableRowActions,
  DataTableStatusPill,
  DATA_TABLE_PRIMARY_TEXT_CLASS,
  DATA_TABLE_SECONDARY_TEXT_CLASS,
} from "../../components/list";
import type { TableSortOrder } from "../../components/ui/table/SortableHeaderCell";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

type DemoRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  detail: string;
};

type PersonRow = {
  id: string;
  name: string;
  email: string;
  position: string;
  salary: string;
  office: string;
  status: "Hired" | "In Progress" | "Pending";
};

const DEMO_ROWS: DemoRow[] = [
  {
    id: "1",
    code: "PLAN-001",
    name: "ICE640 생산",
    status: "진행중",
    detail: "유닛 3건 — LOT·담당·검출기 S/N",
  },
  {
    id: "2",
    code: "PLAN-002",
    name: "ICC640 생산",
    status: "완료",
    detail: "유닛 2건 — 납품 완료",
  },
];

const PERSON_ROWS: PersonRow[] = [
  {
    id: "1",
    name: "Lindsey Curtis",
    email: "demoemail@gmail.com",
    position: "Software Engineer",
    salary: "$89,500",
    office: "Edinburgh",
    status: "Hired",
  },
  {
    id: "2",
    name: "Abram Schleifer",
    email: "demoemail@gmail.com",
    position: "Software Engineer",
    salary: "$89,500",
    office: "Edinburgh",
    status: "Hired",
  },
  {
    id: "3",
    name: "Carla George",
    email: "demoemail@gmail.com",
    position: "Integration Specialist",
    salary: "$15,500",
    office: "London",
    status: "Pending",
  },
  {
    id: "4",
    name: "Ekstrom Bothman",
    email: "demoemail@gmail.com",
    position: "Sales Assistant",
    salary: "$19,200",
    office: "San Francisco",
    status: "Hired",
  },
  {
    id: "5",
    name: "Emery Culhane",
    email: "demoemail@gmail.com",
    position: "Pre-Sales Support",
    salary: "$23,500",
    office: "New York",
    status: "In Progress",
  },
];

const HEADER_CELL =
  "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400";

function personStatusTone(
  status: PersonRow["status"]
): "success" | "warning" | "error" {
  if (status === "Hired") return "success";
  if (status === "In Progress") return "warning";
  return "error";
}

function sortPersonRows(
  rows: PersonRow[],
  sortBy: string,
  sortOrder: TableSortOrder
): PersonRow[] {
  const sorted = [...rows].sort((a, b) => {
    const av = String(a[sortBy as keyof PersonRow] ?? "");
    const bv = String(b[sortBy as keyof PersonRow] ?? "");
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
  });
  return sortOrder === "desc" ? sorted.reverse() : sorted;
}

export function UiPlaygroundTableTab() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [gridSelectAll, setGridSelectAll] = useState(false);
  const [gridSelectedIds, setGridSelectedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [gridSortBy, setGridSortBy] = useState("name");
  const [gridSortOrder, setGridSortOrder] = useState<TableSortOrder>("asc");

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rowIds = useMemo(() => DEMO_ROWS.map((r) => r.id), []);
  const personIds = useMemo(() => PERSON_ROWS.map((r) => r.id), []);

  const toggleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(rowIds) : new Set());
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      setSelectAll(next.size === rowIds.length);
      return next;
    });
  };

  const toggleGridSelectAll = (checked: boolean) => {
    setGridSelectAll(checked);
    setGridSelectedIds(checked ? new Set(personIds) : new Set());
  };

  const toggleGridRow = (id: string, checked: boolean) => {
    setGridSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      setGridSelectAll(next.size === personIds.length);
      return next;
    });
  };

  const toggleGridSort = (sortKey: string) => {
    if (gridSortBy === sortKey) {
      setGridSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setGridSortBy(sortKey);
    setGridSortOrder("asc");
  };

  const sortedPersonRows = useMemo(
    () => sortPersonRows(PERSON_ROWS, gridSortBy, gridSortOrder),
    [gridSortBy, gridSortOrder]
  );

  return (
    <div className="space-y-6">
      <ComponentCard
        title="Table"
        desc="목록 화면 공통 테이블. HTML `Table`, 접이식 `CollapsibleDataTable`, 대량 데이터용 grid `DataTable`."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>
            헤더: <code>TableCell isHeader</code> +{" "}
            <code>text-theme-xs text-gray-500</code>
          </li>
          <li>
            본문: <code>px-5 py-4 text-theme-sm</code>, 숫자·코드는{" "}
            <code>font-mono tabular-nums</code>
          </li>
          <li>
            콜랩스 목록: <code>CollapsibleDataTable</code> — 생산·납품 계획
            목록과 동일
          </li>
          <li>
            Grid 데이터 테이블: <code>DataTable</code> — 12열 grid, 정렬·선택·
            행 액션
          </li>
        </ul>
      </ComponentCard>

      <ComponentCard
        title="DataTable (Grid)"
        desc="`components/list/DataTable` — Flowbite grid 패턴. 많은 컬럼·행 선택·정렬·행 액션이 필요할 때 사용합니다."
      >
        <DataTable>
          <DataTableHeader>
            <DataTableHeaderCell
              colSpan={3}
              sortKey="name"
              activeSortBy={gridSortBy}
              activeSortOrder={gridSortOrder}
              onToggleSort={toggleGridSort}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id="ui-grid-select-all"
                  checked={gridSelectAll}
                  indeterminate={
                    gridSelectedIds.size > 0 &&
                    gridSelectedIds.size < personIds.length
                  }
                  onChange={toggleGridSelectAll}
                  aria-label="전체 선택"
                />
                <DataTableHeaderLabel>User</DataTableHeaderLabel>
              </div>
            </DataTableHeaderCell>
            <DataTableHeaderCell
              colSpan={3}
              sortKey="position"
              activeSortBy={gridSortBy}
              activeSortOrder={gridSortOrder}
              onToggleSort={toggleGridSort}
            >
              <DataTableHeaderLabel>Position</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell
              colSpan={2}
              sortKey="salary"
              activeSortBy={gridSortBy}
              activeSortOrder={gridSortOrder}
              onToggleSort={toggleGridSort}
            >
              <DataTableHeaderLabel>Salary</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell
              colSpan={2}
              sortKey="office"
              activeSortBy={gridSortBy}
              activeSortOrder={gridSortOrder}
              onToggleSort={toggleGridSort}
            >
              <DataTableHeaderLabel>Office</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell
              colSpan={1}
              sortKey="status"
              activeSortBy={gridSortBy}
              activeSortOrder={gridSortOrder}
              onToggleSort={toggleGridSort}
            >
              <DataTableHeaderLabel>Status</DataTableHeaderLabel>
            </DataTableHeaderCell>
            <DataTableHeaderCell colSpan={1} sortable={false}>
              <DataTableHeaderLabel>Action</DataTableHeaderLabel>
            </DataTableHeaderCell>
          </DataTableHeader>

          <DataTableBody>
            {sortedPersonRows.map((person) => (
              <DataTableRow
                key={person.id}
                selected={gridSelectedIds.has(person.id)}
              >
                <DataTableCell colSpan={3}>
                  <div className="flex gap-3">
                    <div className="mt-1">
                      <Checkbox
                        id={`ui-grid-row-${person.id}`}
                        checked={gridSelectedIds.has(person.id)}
                        onChange={(checked) =>
                          toggleGridRow(person.id, checked)
                        }
                        aria-label={`${person.name} 선택`}
                      />
                    </div>
                    <div>
                      <p className={DATA_TABLE_PRIMARY_TEXT_CLASS}>
                        {person.name}
                      </p>
                      <span className={DATA_TABLE_SECONDARY_TEXT_CLASS}>
                        {person.email}
                      </span>
                    </div>
                  </div>
                </DataTableCell>
                <DataTableCell colSpan={3}>{person.position}</DataTableCell>
                <DataTableCell colSpan={2}>{person.salary}</DataTableCell>
                <DataTableCell colSpan={2}>{person.office}</DataTableCell>
                <DataTableCell colSpan={1}>
                  <DataTableStatusPill tone={personStatusTone(person.status)}>
                    {person.status}
                  </DataTableStatusPill>
                </DataTableCell>
                <DataTableCell colSpan={1} className="border-r-0">
                  <DataTableRowActions
                    onDelete={() => undefined}
                    onEdit={() => undefined}
                  />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </ComponentCard>

      <ComponentCard
        title="기본 Table"
        desc="`components/ui/table` — 최소 예시."
      >
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className={HEADER_CELL}>
                  코드
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  이름
                </TableCell>
                <TableCell isHeader className={HEADER_CELL}>
                  상태
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {DEMO_ROWS.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-5 py-4 font-mono text-theme-sm text-gray-800 dark:text-white/90">
                    {row.code}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                    {row.name}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-theme-sm">
                    <Badge
                      color={row.status === "완료" ? "success" : "primary"}
                      size="sm"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>

      <ComponentCard
        title="CollapsibleDataTable"
        desc="행 클릭으로 펼침. 체크박스는 `stopPropagation`으로 행 토글과 분리합니다."
      >
        <CollapsibleDataTable
          items={DEMO_ROWS}
          getRowId={(row) => row.id}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          colSpan={5}
          header={
            <TableRow>
              <TableCell isHeader className="w-10 px-3 py-3">
                <Checkbox
                  id="ui-table-select-all"
                  checked={selectAll}
                  indeterminate={
                    selectedIds.size > 0 && selectedIds.size < rowIds.length
                  }
                  onChange={toggleSelectAll}
                  aria-label="전체 선택"
                />
              </TableCell>
              <TableCell isHeader className={HEADER_CELL}>
                계획
              </TableCell>
              <TableCell isHeader className={HEADER_CELL}>
                품목
              </TableCell>
              <TableCell isHeader className={HEADER_CELL}>
                상태
              </TableCell>
              <TableCell isHeader className={`${HEADER_CELL} text-end`}>
                액션
              </TableCell>
            </TableRow>
          }
          renderRow={(row, { expanded }) => (
            <>
              <TableCell className="w-10 px-3 py-3">
                <div
                  className="flex justify-center"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <Checkbox
                    id={`ui-table-row-${row.id}`}
                    checked={selectedIds.has(row.id)}
                    onChange={(checked) => toggleRow(row.id, checked)}
                    aria-label={`${row.code} 선택`}
                  />
                </div>
              </TableCell>
              <TableCell className="px-5 py-4 font-mono text-theme-sm font-medium text-gray-900 dark:text-white/90">
                {row.code}
                <span className="ml-2 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                  {expanded ? "▲" : "▼"}
                </span>
              </TableCell>
              <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                {row.name}
              </TableCell>
              <TableCell className="px-5 py-4 text-theme-sm">
                <Badge color="primary" size="sm">
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="px-5 py-4 text-end text-theme-sm text-brand-600 dark:text-brand-400">
                상세
              </TableCell>
            </>
          )}
          renderExpanded={(row) => (
            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 text-theme-sm text-gray-700 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-300">
              {row.detail}
            </div>
          )}
        />
      </ComponentCard>
    </div>
  );
}
