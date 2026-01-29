package history

import (
	"encoding/json"
	"fmt"
	"time"
)

type Summary struct {
	SizeBytes        int64   `json:"sizeBytes"`
	InefficientBytes int64   `json:"inefficientBytes"`
	EfficiencyScore  float64 `json:"efficiencyScore"`
}

type Metadata struct {
	ID          string    `json:"id"`
	Image       string    `json:"image"`
	Source      string    `json:"source"`
	CreatedAt   time.Time `json:"createdAt"`
	CompletedAt time.Time `json:"completedAt"`
	Summary     Summary   `json:"summary"`
}

type Entry struct {
	Metadata Metadata        `json:"metadata"`
	Result   json.RawMessage `json:"result"`
}

type diveSummaryPayload struct {
	Image struct {
		SizeBytes        int64   `json:"sizeBytes"`
		InefficientBytes int64   `json:"inefficientBytes"`
		EfficiencyScore  float64 `json:"efficiencyScore"`
	} `json:"image"`
}

func NewEntry(id string, image string, source string, startedAt time.Time, completedAt time.Time, result json.RawMessage) (Entry, error) {
	if len(result) == 0 {
		return Entry{}, fmt.Errorf("analysis result is empty")
	}

	var payload diveSummaryPayload
	if err := json.Unmarshal(result, &payload); err != nil {
		return Entry{}, fmt.Errorf("failed to parse analysis result: %w", err)
	}

	metadata := Metadata{
		ID:          id,
		Image:       image,
		Source:      source,
		CreatedAt:   startedAt,
		CompletedAt: completedAt,
		Summary: Summary{
			SizeBytes:        payload.Image.SizeBytes,
			InefficientBytes: payload.Image.InefficientBytes,
			EfficiencyScore:  payload.Image.EfficiencyScore,
		},
	}

	return Entry{
		Metadata: metadata,
		Result:   result,
	}, nil
}
