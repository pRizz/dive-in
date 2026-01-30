import { useMemo, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import { DiveLayer } from "./models";
import { formatBytes, extractId } from "./utils";

interface TableProps {
  rows: DiveLayer[];
}

type SortKey = "index" | "sizeBytes";

function getSortValue(layer: DiveLayer, key: SortKey) {
  switch (key) {
    case "index":
      return layer.index ?? 0;
    case "sizeBytes":
      return layer.sizeBytes ?? 0;
    default:
      return 0;
  }
}

function compareSortValues(a: number | string, b: number | string) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b));
}

export default function LayersTable(props: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("index");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const copy = [...props.rows];
    copy.sort((left, right) => {
      const leftValue = getSortValue(left, sortKey);
      const rightValue = getSortValue(right, sortKey);
      return compareSortValues(leftValue, rightValue) * direction;
    });
    return copy;
  }, [props.rows, sortDirection, sortKey]);
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table sx={{ minWidth: 650 }} size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }} align="right">
              <TableSortLabel
                active={sortKey === "index"}
                direction={sortKey === "index" ? sortDirection : "asc"}
                onClick={() => handleSort("index")}
              >
                Index
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="center">
              ID
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">
              <TableSortLabel
                active={sortKey === "sizeBytes"}
                direction={sortKey === "sizeBytes" ? sortDirection : "asc"}
                onClick={() => handleSort("sizeBytes")}
              >
                Size
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">
              Command
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row, i) => (
            <TableRow key={i} hover>
              <TableCell align="center">{row.index}</TableCell>
              <TableCell align="center">{extractId(row.id)}</TableCell>
              <TableCell align="right">{formatBytes(row.sizeBytes)}</TableCell>
              <TableCell align="right">{row.command.substring(0, 100)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
  