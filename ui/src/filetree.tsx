import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { FileChangeType, FileTreeNode, LayerFileTree } from "./models";
import { formatBytes } from "./utils";

type ChangeFilter = "all" | "added" | "modified" | "removed";

interface FileTreeProps {
  aggregateTree: FileTreeNode[];
  layers: LayerFileTree[];
}

const changeLabels: Record<FileChangeType, string> = {
  added: "Added",
  modified: "Modified",
  removed: "Removed",
  unchanged: "Unchanged",
  unknown: "Unknown",
};

function changeChipColor(change: FileChangeType) {
  switch (change) {
    case "added":
      return "success";
    case "modified":
      return "warning";
    case "removed":
      return "error";
    default:
      return "default";
  }
}

function filterTreeByChange(
  nodes: FileTreeNode[],
  filter: ChangeFilter
): FileTreeNode[] {
  if (filter === "all") {
    return nodes;
  }
  const filtered: FileTreeNode[] = [];
  nodes.forEach((node) => {
    const children = node.children
      ? filterTreeByChange(node.children, filter)
      : [];
    const matches = node.change === filter;
    if (matches || children.length > 0) {
      filtered.push({
        ...node,
        children: children.length > 0 ? children : undefined,
      });
    }
  });
  return filtered;
}

function getLayerLabel(layer: LayerFileTree, fallbackIndex: number) {
  const indexLabel =
    layer.layerIndex !== undefined ? layer.layerIndex : fallbackIndex;
  const commandLabel = layer.command ? layer.command.substring(0, 40) : "";
  const suffix = commandLabel ? ` — ${commandLabel}` : "";
  return `Layer ${indexLabel}${suffix}`;
}

export default function FileTree(props: FileTreeProps) {
  const [selectedLayer, setSelectedLayer] = useState<string>("aggregate");
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>("all");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set()
  );

  const layers = useMemo(() => props.layers ?? [], [props.layers]);
  const activeTree = useMemo(() => {
    if (selectedLayer === "aggregate") {
      return props.aggregateTree ?? [];
    }
    const match = layers.find(
      (layer, index) =>
        String(layer.layerIndex ?? index) === selectedLayer
    );
    return match?.tree ?? [];
  }, [layers, props.aggregateTree, selectedLayer]);

  const filteredTree = useMemo(
    () => filterTreeByChange(activeTree, changeFilter),
    [activeTree, changeFilter]
  );

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((previous) => {
      const next = new Set(previous);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  const renderNode = (
    node: FileTreeNode,
    depth: number,
    index: number,
    parentKey: string
  ) => {
    const nodeKey = `${parentKey}/${node.path || node.name}-${index}`;
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = expandedNodes.has(nodeKey);
    const changeLabel = node.change ? changeLabels[node.change] : undefined;
    const showChange =
      node.change === "added" ||
      node.change === "modified" ||
      node.change === "removed";
    const sizeLabel =
      typeof node.sizeBytes === "number" ? formatBytes(node.sizeBytes) : "";

    const secondaryParts = [];
    if (node.path && node.path !== node.name) {
      secondaryParts.push(node.path);
    }
    if (sizeLabel) {
      secondaryParts.push(sizeLabel);
    }
    const secondaryText =
      secondaryParts.length > 0 ? secondaryParts.join(" | ") : undefined;

    return (
      <Box key={nodeKey}>
        <ListItem disablePadding>
          {hasChildren ? (
            <ListItemButton
              onClick={() => toggleNode(nodeKey)}
              sx={{ pl: 2 + depth * 2 }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flex={1}>
                <Typography
                  variant="body2"
                  sx={{ width: 16, textAlign: "center" }}
                  color="text.secondary"
                >
                  {isExpanded ? "v" : ">"}
                </Typography>
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Typography variant="body2">{node.name}</Typography>
                      {showChange ? (
                        <Chip
                          label={changeLabel}
                          size="small"
                          variant="outlined"
                          color={changeChipColor(node.change ?? "unknown")}
                        />
                      ) : null}
                    </Stack>
                  }
                  secondary={
                    secondaryText ? (
                      <Typography variant="caption" color="text.secondary">
                        {secondaryText}
                      </Typography>
                    ) : null
                  }
                />
              </Stack>
            </ListItemButton>
          ) : (
            <Box sx={{ px: 2, py: 1, pl: 2 + depth * 2, width: "100%" }}>
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography variant="body2">{node.name}</Typography>
                    {showChange ? (
                      <Chip
                        label={changeLabel}
                        size="small"
                        variant="outlined"
                        color={changeChipColor(node.change ?? "unknown")}
                      />
                    ) : null}
                  </Stack>
                }
                secondary={
                  secondaryText ? (
                    <Typography variant="caption" color="text.secondary">
                      {secondaryText}
                    </Typography>
                  ) : null
                }
              />
            </Box>
          )}
        </ListItem>
        {hasChildren ? (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {node.children?.map((child, childIndex) =>
                renderNode(child, depth + 1, childIndex, nodeKey)
              )}
            </List>
          </Collapse>
        ) : null}
      </Box>
    );
  };

  const hasLayerOptions = layers.length > 0;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
        >
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="layer-select-label">Layer view</InputLabel>
            <Select
              labelId="layer-select-label"
              label="Layer view"
              value={selectedLayer}
              disabled={!hasLayerOptions}
              onChange={(event) => setSelectedLayer(event.target.value)}
            >
              <MenuItem value="aggregate">Aggregate (all layers)</MenuItem>
              {layers.map((layer, index) => (
                <MenuItem
                  key={layer.layerId ?? index}
                  value={String(layer.layerIndex ?? index)}
                >
                  {getLayerLabel(layer, index)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={changeFilter}
            exclusive
            size="small"
            onChange={(_, value) =>
              setChangeFilter(value === null ? "all" : value)
            }
          >
            <ToggleButton value="all">All changes</ToggleButton>
            <ToggleButton value="added">Added</ToggleButton>
            <ToggleButton value="modified">Modified</ToggleButton>
            <ToggleButton value="removed">Removed</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {filteredTree.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No file tree data available for the selected layer.
          </Typography>
        ) : (
          <List dense disablePadding>
            {filteredTree.map((node, index) =>
              renderNode(node, 0, index, "root")
            )}
          </List>
        )}
      </Stack>
    </Paper>
  );
}
