package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"dive-in/ci"
	"dive-in/exports"
	"dive-in/history"
	"github.com/labstack/echo"
	"github.com/sirupsen/logrus"
)

const analysisTimeout = 5 * time.Minute
const historyDir = "/data/history"
const historyMaxEntries = 50

type JobStatus string

const (
	StatusQueued    JobStatus = "queued"
	StatusRunning   JobStatus = "running"
	StatusSucceeded JobStatus = "succeeded"
	StatusFailed    JobStatus = "failed"
)

type Job struct {
	ID          string
	Status      JobStatus
	Message     string
	Result      json.RawMessage
	Source      string
	Target      string
	CreatedAt   time.Time
	CompletedAt time.Time
}

type JobStore struct {
	mu   sync.RWMutex
	jobs map[string]*Job
}

func NewJobStore() *JobStore {
	return &JobStore{jobs: make(map[string]*Job)}
}

func (s *JobStore) Create() *Job {
	job := &Job{
		ID:        newJobID(),
		Status:    StatusQueued,
		CreatedAt: time.Now(),
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.jobs[job.ID] = job
	return job
}

func (s *JobStore) Get(id string) (*Job, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	job, ok := s.jobs[id]
	return job, ok
}

func (s *JobStore) Update(id string, update func(job *Job)) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[id]
	if !ok {
		return false
	}
	update(job)
	return true
}

type AnalyzeRequest struct {
	Image       string `json:"image"`
	Source      string `json:"source"`
	ArchivePath string `json:"archivePath,omitempty"`
}

type AnalyzeResponse struct {
	JobID  string    `json:"jobId"`
	Status JobStatus `json:"status"`
}

type AnalysisStatusResponse struct {
	JobID   string    `json:"jobId"`
	Status  JobStatus `json:"status"`
	Message string    `json:"message,omitempty"`
}

type AnalysisErrorResponse struct {
	Status  JobStatus `json:"status,omitempty"`
	Message string    `json:"message"`
}

type ExportRequest struct {
	Format string `json:"format"`
}

type ExportResponse struct {
	Format      string `json:"format"`
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
}

var jobStore = NewJobStore()
var historyStore = history.NewStore(historyDir, historyMaxEntries)

func main() {
	var socketPath string
	flag.StringVar(&socketPath, "socket", "/run/guest/volumes-service.sock", "Unix domain socket to listen on")
	flag.Parse()

	os.RemoveAll(socketPath)

	logrus.New().Infof("Starting listening on %s\n", socketPath)
	router := echo.New()
	router.HideBanner = true

	startURL := ""

	ln, err := listen(socketPath)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to listen")
	}
	router.Listener = ln

	router.GET("/checkdive", checkDive)
	router.POST("/analyze", analyzeImage)
	router.GET("/analysis/:id/status", getAnalysisStatus)
	router.GET("/analysis/:id/result", getAnalysisResult)
	router.GET("/history", listHistory)
	router.GET("/history/:id", getHistoryEntry)
	router.DELETE("/history/:id", deleteHistoryEntry)
	router.POST("/history/:id/export", createHistoryExport)
	router.GET("/history/:id/export/:format", downloadHistoryExport)
	router.POST("/ci/rules", createCIRules)

	if err := router.Start(startURL); err != nil {
		logrus.WithError(err).Fatal("Server stopped")
	}
}

func listen(path string) (net.Listener, error) {
	return net.Listen("unix", path)
}

func analyzeImage(c echo.Context) error {
	var req AnalyzeRequest
	if err := c.Bind(&req); err != nil {
		return jsonError(c, http.StatusBadRequest, "Invalid analyze request payload")
	}

	req.Source = strings.TrimSpace(req.Source)
	if req.Source == "" {
		req.Source = "docker"
	}

	target, err := resolveAnalyzeTarget(req)
	if err != nil {
		return jsonError(c, http.StatusBadRequest, err.Error())
	}

	job := jobStore.Create()
	jobStore.Update(job.ID, func(job *Job) {
		job.Source = req.Source
		job.Target = target
	})
	go runAnalyzeJob(job.ID, req, target)

	return c.JSON(http.StatusAccepted, AnalyzeResponse{
		JobID:  job.ID,
		Status: job.Status,
	})
}

func checkDive(c echo.Context) error {
	_, err := exec.LookPath("/usr/local/bin/dive")
	if err != nil {
		return c.JSON(http.StatusNotFound, HTTPMessageBody{Message: "Dive is not found"})
	}
	return c.JSON(http.StatusOK, HTTPMessageBody{Message: "Dive is installed"})
}

type HTTPMessageBody struct {
	Message string
}

func getAnalysisStatus(c echo.Context) error {
	jobID := c.Param("id")
	job, ok := jobStore.Get(jobID)
	if !ok {
		return jsonError(c, http.StatusNotFound, "Analysis job not found")
	}
	return c.JSON(http.StatusOK, AnalysisStatusResponse{
		JobID:   job.ID,
		Status:  job.Status,
		Message: job.Message,
	})
}

func getAnalysisResult(c echo.Context) error {
	jobID := c.Param("id")
	job, ok := jobStore.Get(jobID)
	if !ok {
		return jsonError(c, http.StatusNotFound, "Analysis job not found")
	}
	if job.Status != StatusSucceeded {
		message := job.Message
		if message == "" {
			message = "Analysis is not complete yet"
		}
		return c.JSON(http.StatusConflict, AnalysisErrorResponse{
			Status:  job.Status,
			Message: message,
		})
	}
	if len(job.Result) == 0 {
		return c.JSON(http.StatusInternalServerError, AnalysisErrorResponse{
			Status:  job.Status,
			Message: "Analysis result is empty",
		})
	}
	return c.JSONBlob(http.StatusOK, job.Result)
}

func runAnalyzeJob(jobID string, req AnalyzeRequest, target string) {
	jobStore.Update(jobID, func(job *Job) {
		job.Status = StatusRunning
		job.Message = ""
	})

	result, err := runDive(req.Source, target)
	if err != nil {
		jobStore.Update(jobID, func(job *Job) {
			job.Status = StatusFailed
			job.Message = err.Error()
		})
		return
	}

	completedAt := time.Now()
	jobStore.Update(jobID, func(job *Job) {
		job.Status = StatusSucceeded
		job.Message = ""
		job.Result = result
		job.CompletedAt = completedAt
	})

	job, ok := jobStore.Get(jobID)
	if !ok {
		return
	}
	entry, err := history.NewEntry(job.ID, job.Target, job.Source, job.CreatedAt, job.CompletedAt, job.Result)
	if err != nil {
		logrus.WithError(err).Warn("Failed to build history entry")
		return
	}
	if err := historyStore.Save(entry); err != nil {
		logrus.WithError(err).Warn("Failed to persist history entry")
	}
}

func runDive(source string, target string) (json.RawMessage, error) {
	if _, err := exec.LookPath("dive"); err != nil {
		return nil, fmt.Errorf("Dive binary not found in PATH")
	}

	tempFile, err := os.CreateTemp("", "dive-result-*.json")
	if err != nil {
		return nil, fmt.Errorf("Failed to prepare analysis output: %w", err)
	}
	tempPath := tempFile.Name()
	if err := tempFile.Close(); err != nil {
		return nil, fmt.Errorf("Failed to prepare analysis output: %w", err)
	}
	defer os.Remove(tempPath)

	ctx, cancel := context.WithTimeout(context.Background(), analysisTimeout)
	defer cancel()

	args := []string{"--source", source, target, "--json", tempPath}
	cmd := exec.CommandContext(ctx, "dive", args...)
	output, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return nil, fmt.Errorf("Dive timed out after %s", analysisTimeout)
	}
	if err != nil {
		message := strings.TrimSpace(string(output))
		if message == "" {
			message = err.Error()
		}
		return nil, fmt.Errorf("Dive failed: %s", message)
	}

	byteValue, err := os.ReadFile(tempPath)
	if err != nil {
		return nil, fmt.Errorf("Failed to read analysis output: %w", err)
	}
	if !json.Valid(byteValue) {
		return nil, fmt.Errorf("Dive output was not valid JSON")
	}

	return json.RawMessage(byteValue), nil
}

func resolveAnalyzeTarget(req AnalyzeRequest) (string, error) {
	switch req.Source {
	case "docker":
		if strings.TrimSpace(req.Image) == "" {
			return "", fmt.Errorf("Image reference is required for Docker source")
		}
		return req.Image, nil
	case "docker-archive":
		if strings.TrimSpace(req.ArchivePath) == "" {
			return "", fmt.Errorf("Archive path is required for docker-archive source")
		}
		return req.ArchivePath, nil
	default:
		return "", fmt.Errorf("Unsupported source: %s", req.Source)
	}
}

func jsonError(c echo.Context, status int, message string) error {
	return c.JSON(status, AnalysisErrorResponse{Message: message})
}

func listHistory(c echo.Context) error {
	entries, err := historyStore.List()
	if err != nil {
		return jsonError(c, http.StatusInternalServerError, "Failed to load history")
	}
	return c.JSON(http.StatusOK, entries)
}

func getHistoryEntry(c echo.Context) error {
	id := c.Param("id")
	entry, err := historyStore.Get(id)
	if err != nil {
		if errors.Is(err, history.ErrNotFound) {
			return jsonError(c, http.StatusNotFound, "History entry not found")
		}
		return jsonError(c, http.StatusInternalServerError, "Failed to load history entry")
	}
	return c.JSON(http.StatusOK, entry)
}

func deleteHistoryEntry(c echo.Context) error {
	id := c.Param("id")
	if _, err := historyStore.Get(id); err != nil {
		if errors.Is(err, history.ErrNotFound) {
			return jsonError(c, http.StatusNotFound, "History entry not found")
		}
		return jsonError(c, http.StatusInternalServerError, "Failed to load history entry")
	}
	if err := historyStore.Delete(id); err != nil {
		return jsonError(c, http.StatusInternalServerError, "Failed to delete history entry")
	}
	return c.NoContent(http.StatusNoContent)
}

func createHistoryExport(c echo.Context) error {
	id := c.Param("id")
	var req ExportRequest
	if err := c.Bind(&req); err != nil {
		return jsonError(c, http.StatusBadRequest, "Invalid export request payload")
	}
	format, err := exports.ParseFormat(req.Format)
	if err != nil {
		return jsonError(c, http.StatusBadRequest, err.Error())
	}

	entry, err := historyStore.Get(id)
	if err != nil {
		if errors.Is(err, history.ErrNotFound) {
			return jsonError(c, http.StatusNotFound, "History entry not found")
		}
		return jsonError(c, http.StatusInternalServerError, "Failed to load history entry")
	}

	exported, err := exports.Generate(format, entry)
	if err != nil {
		return jsonError(c, http.StatusInternalServerError, "Failed to generate export")
	}

	exportDir := historyStore.ExportsDir(id)
	if err := os.MkdirAll(exportDir, 0o755); err != nil {
		return jsonError(c, http.StatusInternalServerError, "Failed to prepare export storage")
	}
	exportPath := filepath.Join(exportDir, exported.Filename)
	if err := os.WriteFile(exportPath, exported.Data, 0o644); err != nil {
		return jsonError(c, http.StatusInternalServerError, "Failed to store export")
	}

	return c.JSON(http.StatusOK, ExportResponse{
		Format:      string(exported.Format),
		Filename:    exported.Filename,
		ContentType: exported.ContentType,
	})
}

func downloadHistoryExport(c echo.Context) error {
	id := c.Param("id")
	formatParam := c.Param("format")
	format, err := exports.ParseFormat(formatParam)
	if err != nil {
		return jsonError(c, http.StatusBadRequest, err.Error())
	}

	filename := exports.Filename(id, format)
	exportPath := filepath.Join(historyStore.ExportsDir(id), filename)
	data, err := os.ReadFile(exportPath)
	if err != nil {
		if os.IsNotExist(err) {
			return jsonError(c, http.StatusNotFound, "Export not found")
		}
		return jsonError(c, http.StatusInternalServerError, "Failed to read export")
	}

	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, exports.ContentType(format), data)
}

func createCIRules(c echo.Context) error {
	var req ci.RulesRequest
	if err := c.Bind(&req); err != nil {
		return jsonError(c, http.StatusBadRequest, "Invalid CI rules request payload")
	}
	content, err := ci.GenerateRules(req)
	if err != nil {
		return jsonError(c, http.StatusBadRequest, err.Error())
	}

	response := ci.RulesResponse{
		Filename: ".dive-ci",
		Content:  string(content),
	}
	return c.JSON(http.StatusOK, response)
}

func newJobID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("job-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}
