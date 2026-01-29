package ci

import (
	"fmt"

	"gopkg.in/yaml.v3"
)

type RulesRequest struct {
	LowestEfficiency         *float64 `json:"lowestEfficiency,omitempty"`
	HighestWastedBytes       string   `json:"highestWastedBytes,omitempty"`
	HighestUserWastedPercent *float64 `json:"highestUserWastedPercent,omitempty"`
}

type RulesResponse struct {
	Filename string `json:"filename"`
	Content  string `json:"content"`
}

type rulesPayload struct {
	Rules rulesConfig `yaml:"rules"`
}

type rulesConfig struct {
	LowestEfficiency         *float64 `yaml:"lowestEfficiency,omitempty"`
	HighestWastedBytes       string   `yaml:"highestWastedBytes,omitempty"`
	HighestUserWastedPercent *float64 `yaml:"highestUserWastedPercent,omitempty"`
}

func GenerateRules(request RulesRequest) ([]byte, error) {
	if request.LowestEfficiency == nil && request.HighestWastedBytes == "" && request.HighestUserWastedPercent == nil {
		return nil, fmt.Errorf("at least one rule threshold is required")
	}

	payload := rulesPayload{
		Rules: rulesConfig{
			LowestEfficiency:         request.LowestEfficiency,
			HighestWastedBytes:       request.HighestWastedBytes,
			HighestUserWastedPercent: request.HighestUserWastedPercent,
		},
	}

	output, err := yaml.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return output, nil
}
