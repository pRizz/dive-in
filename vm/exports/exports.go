package exports

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"html/template"
	"sort"
	"strings"

	"dive-in/history"
)

type Format string

const (
	FormatJSON Format = "json"
	FormatCSV  Format = "csv"
	FormatHTML Format = "html"
)

type ExportedFile struct {
	Format      Format
	Filename    string
	ContentType string
	Data        []byte
}

func ParseFormat(value string) (Format, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(FormatJSON):
		return FormatJSON, nil
	case string(FormatCSV):
		return FormatCSV, nil
	case string(FormatHTML):
		return FormatHTML, nil
	default:
		return "", fmt.Errorf("unsupported export format: %s", value)
	}
}

func Filename(id string, format Format) string {
	return fmt.Sprintf("dive-export-%s.%s", id, format)
}

func ContentType(format Format) string {
	switch format {
	case FormatCSV:
		return "text/csv"
	case FormatHTML:
		return "text/html"
	default:
		return "application/json"
	}
}

func Generate(format Format, entry history.Entry) (ExportedFile, error) {
	switch format {
	case FormatJSON:
		return ExportedFile{
			Format:      format,
			Filename:    Filename(entry.Metadata.ID, format),
			ContentType: ContentType(format),
			Data:        entry.Result,
		}, nil
	case FormatCSV:
		data, err := generateCSV(entry)
		if err != nil {
			return ExportedFile{}, err
		}
		return ExportedFile{
			Format:      format,
			Filename:    Filename(entry.Metadata.ID, format),
			ContentType: ContentType(format),
			Data:        data,
		}, nil
	case FormatHTML:
		data, err := generateHTML(entry)
		if err != nil {
			return ExportedFile{}, err
		}
		return ExportedFile{
			Format:      format,
			Filename:    Filename(entry.Metadata.ID, format),
			ContentType: ContentType(format),
			Data:        data,
		}, nil
	default:
		return ExportedFile{}, fmt.Errorf("unsupported export format: %s", format)
	}
}

type diveExportPayload struct {
	Image struct {
		SizeBytes        int64               `json:"sizeBytes"`
		InefficientBytes int64               `json:"inefficientBytes"`
		EfficiencyScore  float64             `json:"efficiencyScore"`
		FileReference    []diveFileReference `json:"fileReference"`
	} `json:"image"`
}

type diveFileReference struct {
	Count     int64  `json:"count"`
	SizeBytes int64  `json:"sizeBytes"`
	File      string `json:"file"`
}

func generateCSV(entry history.Entry) ([]byte, error) {
	var payload diveExportPayload
	if err := json.Unmarshal(entry.Result, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse analysis result: %w", err)
	}

	topFiles := topFileReferences(payload.Image.FileReference, 10)
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	if err := writer.Write([]string{"category", "name", "sizeBytes", "count", "value"}); err != nil {
		return nil, err
	}
	if err := writer.Write([]string{"summary", "total_size_bytes", fmt.Sprintf("%d", payload.Image.SizeBytes), "", ""}); err != nil {
		return nil, err
	}
	if err := writer.Write([]string{"summary", "wasted_bytes", fmt.Sprintf("%d", payload.Image.InefficientBytes), "", ""}); err != nil {
		return nil, err
	}
	if err := writer.Write([]string{"summary", "efficiency_score", "", "", fmt.Sprintf("%.4f", payload.Image.EfficiencyScore)}); err != nil {
		return nil, err
	}
	for _, file := range topFiles {
		record := []string{"file", file.File, fmt.Sprintf("%d", file.SizeBytes), fmt.Sprintf("%d", file.Count), ""}
		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func generateHTML(entry history.Entry) ([]byte, error) {
	var payload diveExportPayload
	if err := json.Unmarshal(entry.Result, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse analysis result: %w", err)
	}

	type htmlData struct {
		ImageName   string
		CompletedAt string
		SizeBytes   int64
		WastedBytes int64
		Efficiency  float64
		TopFiles    []diveFileReference
	}

	data := htmlData{
		ImageName:   entry.Metadata.Image,
		CompletedAt: entry.Metadata.CompletedAt.Format(timeLayout),
		SizeBytes:   payload.Image.SizeBytes,
		WastedBytes: payload.Image.InefficientBytes,
		Efficiency:  payload.Image.EfficiencyScore,
		TopFiles:    topFileReferences(payload.Image.FileReference, 10),
	}

	const templateBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Dive Analysis Summary</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #1f2933; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #52606d; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e4e7eb; }
    th { background: #f5f7fa; }
  </style>
</head>
<body>
  <h1>Dive Analysis Summary</h1>
  <div class="meta">Image: {{ .ImageName }} • Completed: {{ .CompletedAt }}</div>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total size (bytes)</td><td>{{ .SizeBytes }}</td></tr>
    <tr><td>Wasted bytes</td><td>{{ .WastedBytes }}</td></tr>
    <tr><td>Efficiency score</td><td>{{ printf "%.4f" .Efficiency }}</td></tr>
  </table>
  <h2>Largest files</h2>
  <table>
    <tr><th>File</th><th>Size (bytes)</th><th>Count</th></tr>
    {{ range .TopFiles }}
    <tr><td>{{ .File }}</td><td>{{ .SizeBytes }}</td><td>{{ .Count }}</td></tr>
    {{ end }}
  </table>
</body>
</html>`

	tmpl, err := template.New("export").Parse(templateBody)
	if err != nil {
		return nil, err
	}

	var buffer bytes.Buffer
	if err := tmpl.Execute(&buffer, data); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

const timeLayout = "2006-01-02 15:04:05 MST"

func topFileReferences(files []diveFileReference, limit int) []diveFileReference {
	ordered := make([]diveFileReference, len(files))
	copy(ordered, files)
	sort.Slice(ordered, func(i, j int) bool {
		return ordered[i].SizeBytes > ordered[j].SizeBytes
	})
	if len(ordered) > limit {
		return ordered[:limit]
	}
	return ordered
}
