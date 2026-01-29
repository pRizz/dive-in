import { useMemo } from "react";
import {
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AnalysisResult } from "./models";
import {
  calculatePercent,
  formatBytes,
  formatPercent,
  normalizeDiveFileTrees,
} from "./utils";
import CircularProgressWithLabel from "./ring";
import ImageTable from "./imagetable";
import LayersTable from "./layerstable";
import FileTree from "./filetree";

export default function Analysis(props: {
  analysis: AnalysisResult;
  onExit: () => any;
}) {
  const { image, dive } = props.analysis;
  const fileTreeData = useMemo(() => normalizeDiveFileTrees(dive), [dive]);
  const wastedPercent = calculatePercent(
    dive.image.inefficientBytes,
    dive.image.sizeBytes
  );
  return (
    <>
      <Stack direction="column" spacing={4} alignItems="baseline">
        <Button sx={{ maxWidth: 180 }} variant="outlined" onClick={props.onExit}>
          Back to images
        </Button>
        <Typography variant="h3">Analyzing: {image.name}</Typography>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Helpful links
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Link
              href="https://github.com/wagoodman/dive"
              target="_blank"
              rel="noreferrer"
            >
              Dive docs
            </Link>
            <Link
              href="https://github.com/wagoodman/dive#file-tree"
              target="_blank"
              rel="noreferrer"
            >
              How to read layer changes
            </Link>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography
                sx={{ fontSize: 14 }}
                color="text.secondary"
                gutterBottom
              >
                Total Size
              </Typography>
              <Typography variant="h2">
                {formatBytes(dive.image.sizeBytes)}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography
                sx={{ fontSize: 14 }}
                color="text.secondary"
                gutterBottom
              >
                Wasted space
              </Typography>
              <Typography variant="h2">
                {formatBytes(dive.image.inefficientBytes)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatPercent(wastedPercent)} of total image size
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Tooltip title="Shows how much of the image size is used efficiently. Higher is better.">
                <Typography
                  sx={{ fontSize: 14, cursor: "help" }}
                  color="text.secondary"
                  gutterBottom
                >
                  Efficiency Score
                </Typography>
              </Tooltip>
              <CircularProgressWithLabel
                value={dive.image.efficiencyScore * 100}
              ></CircularProgressWithLabel>
            </CardContent>
          </Card>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Metrics are derived from Dive analysis results.
        </Typography>
        <Stack spacing={2}>
          <Typography variant="h3">Layer file tree</Typography>
          <FileTree
            aggregateTree={fileTreeData.aggregate}
            layers={fileTreeData.layers}
          />
        </Stack>
        <Stack spacing={2}>
          <Typography variant="h3">Largest Files (sorted by size)</Typography>
          <ImageTable rows={dive.image.fileReference}></ImageTable>
        </Stack>
        <Stack spacing={2}>
          <Typography variant="h3">Layers</Typography>
          <LayersTable rows={dive.layer}></LayersTable>
        </Stack>
      </Stack>
    </>
  );
}