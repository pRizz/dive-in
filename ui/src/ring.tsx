import * as React from 'react';
import CircularProgress, { CircularProgressProps } from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface CircularProgressWithLabelProps extends CircularProgressProps {
  value: number;
  labelInset?: number;
}

export default function CircularProgressWithLabel(props: CircularProgressWithLabelProps) {
  const { value, labelInset = 0, size, ...progressProps } = props;
  const resolvedSize = size ?? '4rem';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        width: resolvedSize,
        height: resolvedSize,
      }}
    >
      <CircularProgress size="100%" variant="determinate" value={value} {...progressProps} />
      <Box
        sx={{
          position: 'absolute',
          inset: labelInset,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Typography
          component="div"
          color="text.secondary"
          sx={{
            fontSize: 'clamp(1.9rem, 2.6vw, 2.4rem)',
            lineHeight: 1,
            textAlign: 'center',
          }}
        >{`${Math.round(value)}%`}</Typography>
      </Box>
    </Box>
  );
}
