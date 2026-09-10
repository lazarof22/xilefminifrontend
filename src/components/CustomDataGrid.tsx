// src/components/CustomDataGrid.tsx
import * as React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Toolbar,
  Typography,
} from "@mui/material";

type Order = "asc" | "desc";

export interface Column<T> {
  field: keyof T;
  headerName: string;
  numeric?: boolean;
}

interface CustomDataGridProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => number;
  title?: string;
}

export default function CustomDataGrid<T>({
  rows,
  columns,
  getRowId,
  title = "Tabla",
}: CustomDataGridProps<T>) {
  const [order, setOrder] = React.useState<Order>("asc");
  const [orderBy, setOrderBy] = React.useState<keyof T>(columns[0].field);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [dense, setDense] = React.useState(false);

  const handleRequestSort = (property: keyof T) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedRows = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (bValue < aValue) return order === "asc" ? 1 : -1;
      if (bValue > aValue) return order === "asc" ? -1 : 1;
      return 0;
    });
  }, [rows, order, orderBy]);

  const visibleRows = sortedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(rows.map((row) => getRowId(row)));
    } else {
      setSelected([]);
    }
  };

  const handleRowClick = (id: number) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Toolbar>
          <Typography sx={{ flex: "1 1 100%" }} variant="h6">
            {title}
          </Typography>
        </Toolbar>

        <TableContainer>
          <Table size={dense ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={rows.length > 0 && selected.length === rows.length}
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>

                {columns.map((column) => (
                  <TableCell
                    key={String(column.field)}
                    align={column.numeric ? "right" : "left"}
                    sortDirection={orderBy === column.field ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === column.field}
                      direction={orderBy === column.field ? order : "asc"}
                      onClick={() => handleRequestSort(column.field)}
                    >
                      {column.headerName}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleRows.map((row) => {
                const id = getRowId(row);
                const isSelected = selected.includes(id);

                return (
                  <TableRow
                    key={id}
                    hover
                    selected={isSelected}
                    onClick={() => handleRowClick(id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} />
                    </TableCell>

                    {columns.map((column) => (
                      <TableCell
                        key={String(column.field)}
                        align={column.numeric ? "right" : "left"}
                      >
                        {String(row[column.field])}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
}