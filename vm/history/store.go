package history

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"sync"
)

const (
	defaultMaxEntries = 50
	entryFileName     = "entry.json"
	exportsDirName    = "exports"
)

var ErrNotFound = errors.New("history entry not found")

type Store struct {
	dir        string
	maxEntries int
	mu         sync.Mutex
}

func NewStore(dir string, maxEntries int) *Store {
	if maxEntries <= 0 {
		maxEntries = defaultMaxEntries
	}
	return &Store{
		dir:        dir,
		maxEntries: maxEntries,
	}
}

func (s *Store) BaseDir() string {
	return s.dir
}

func (s *Store) EntryDir(id string) string {
	return filepath.Join(s.dir, id)
}

func (s *Store) EntryPath(id string) string {
	return filepath.Join(s.EntryDir(id), entryFileName)
}

func (s *Store) ExportsDir(id string) string {
	return filepath.Join(s.EntryDir(id), exportsDirName)
}

func (s *Store) Save(entry Entry) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(s.dir, 0o755); err != nil {
		return err
	}

	runDir := s.EntryDir(entry.Metadata.ID)
	if err := os.MkdirAll(runDir, 0o755); err != nil {
		return err
	}

	tempFile, err := os.CreateTemp(runDir, "entry-*.json")
	if err != nil {
		return err
	}

	encoder := json.NewEncoder(tempFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(entry); err != nil {
		tempFile.Close()
		os.Remove(tempFile.Name())
		return err
	}
	if err := tempFile.Close(); err != nil {
		return err
	}

	if err := os.Rename(tempFile.Name(), s.EntryPath(entry.Metadata.ID)); err != nil {
		return err
	}

	return s.pruneLocked()
}

func (s *Store) List() ([]Metadata, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := os.ReadDir(s.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []Metadata{}, nil
		}
		return nil, err
	}

	results := make([]Metadata, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		path := s.EntryPath(entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var parsed Entry
		if err := json.Unmarshal(data, &parsed); err != nil {
			continue
		}
		results = append(results, parsed.Metadata)
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].CompletedAt.After(results[j].CompletedAt)
	})

	return results, nil
}

func (s *Store) Get(id string) (Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.EntryPath(id))
	if err != nil {
		if os.IsNotExist(err) {
			return Entry{}, ErrNotFound
		}
		return Entry{}, err
	}

	var entry Entry
	if err := json.Unmarshal(data, &entry); err != nil {
		return Entry{}, err
	}
	return entry, nil
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := s.EntryDir(id)
	if err := os.RemoveAll(path); err != nil {
		return err
	}
	return nil
}

func (s *Store) DeleteAll() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.RemoveAll(s.dir); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *Store) pruneLocked() error {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var metadata []Metadata
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		data, err := os.ReadFile(s.EntryPath(entry.Name()))
		if err != nil {
			continue
		}
		var parsed Entry
		if err := json.Unmarshal(data, &parsed); err != nil {
			continue
		}
		metadata = append(metadata, parsed.Metadata)
	}

	if len(metadata) <= s.maxEntries {
		return nil
	}

	sort.Slice(metadata, func(i, j int) bool {
		return metadata[i].CompletedAt.Before(metadata[j].CompletedAt)
	})

	toDelete := metadata[:len(metadata)-s.maxEntries]
	for _, entry := range toDelete {
		_ = os.RemoveAll(s.EntryDir(entry.ID))
	}

	return nil
}
