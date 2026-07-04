import { ReactNode, HTMLAttributes, TableHTMLAttributes } from "react";

// Props for Table
interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
}

// Props for TableHeader
interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

// Props for TableBody
interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

// Props for TableRow
interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
}

// Props for TableCell
interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  isHeader?: boolean;
  colSpan?: number;
  rowSpan?: number;
}

// Table Component
const Table: React.FC<TableProps> = ({ children, className, ...props }) => {
  return <table className={`min-w-full ${className || ""}`} {...props}>{children}</table>;
};

// TableHeader Component
const TableHeader: React.FC<TableHeaderProps> = ({ children, className, ...props }) => {
  return <thead className={className} {...props}>{children}</thead>;
};

// TableBody Component
const TableBody: React.FC<TableBodyProps> = ({ children, className, ...props }) => {
  return <tbody className={className} {...props}>{children}</tbody>;
};

// TableRow Component
const TableRow: React.FC<TableRowProps> = ({ children, className, ...props }) => {
  return <tr className={className} {...props}>{children}</tr>;
};

// TableCell Component
const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
  colSpan,
  rowSpan,
  ...props
}) => {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag
      className={`whitespace-nowrap ${className || ""}`}
      colSpan={colSpan}
      rowSpan={rowSpan}
      {...props}
    >
      {children}
    </CellTag>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
