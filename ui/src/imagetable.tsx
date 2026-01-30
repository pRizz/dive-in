import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { FileReference } from './models';
import { formatBytes } from './utils';

interface TableProps {
  rows: FileReference[];
  limit?: number;
}

export default function ImageTable(props: TableProps) {
  const limit = props.limit ?? 120;
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table sx={{ minWidth: 650 }} size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Count</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">
              Total Space
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">
              Path
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.rows.slice(0, limit).map((row, i) => (
            <TableRow key={i} hover>
              <TableCell>{row.count}</TableCell>
              <TableCell align="right">
                {formatBytes(row.sizeBytes)}
              </TableCell>
              <TableCell align="right">{row.file}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
  