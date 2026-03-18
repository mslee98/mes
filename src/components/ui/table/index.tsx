import type { FC, ReactNode, HTMLAttributes } from "react";

// Props for Table
interface TableProps {
  children: ReactNode; // Table content (thead, tbody, etc.)
  className?: string; // Optional className for styling
}

// Props for TableHeader
interface TableHeaderProps {
  children: ReactNode; // Header row(s)
  className?: string; // Optional className for styling
}

// Props for TableBody
interface TableBodyProps {
  children: ReactNode; // Body row(s)
  className?: string; // Optional className for styling
}

// Props for TableRow
interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode; // Cells (th or td)
  className?: string; // Optional className for styling
}

// Props for TableCell
interface TableCellProps {
  children: ReactNode; // Cell content
  isHeader?: boolean; // If true, renders as <th>, otherwise <td>
  className?: string; // Optional className for styling
  colSpan?: number;
}

// Table Component
const Table: FC<TableProps> = ({ children, className }) => {
  return <table className={`min-w-full  ${className}`}>{children}</table>;
};

// TableHeader Component
const TableHeader: FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={className}>{children}</thead>;
};

// TableBody Component
const TableBody: FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={className}>{children}</tbody>;
};

// TableRow Component
const TableRow: FC<TableRowProps> = ({ children, className, ...rest }) => {
  return (
    <tr className={className} {...rest}>
      {children}
    </tr>
  );
};

// TableCell Component
const TableCell: FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
  colSpan,
}) => {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag className={` ${className}`} colSpan={colSpan}>
      {children}
    </CellTag>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
