package db

import (
	"errors"
	"reflect"
	"testing"
)

func TestReplaceStoredObjectFailureAndCleanupMatrix(t *testing.T) {
	uploadErr := errors.New("upload failed")
	persistErr := errors.New("database failed")
	removeErr := errors.New("remove failed")

	tests := []struct {
		name           string
		uploadErr      error
		persistOldPath string
		persistErr     error
		removeErr      error
		wantRemoved    []string
		wantErr        error
		wantCleanupErr bool
	}{
		{name: "upload failure changes nothing", uploadErr: uploadErr, wantErr: uploadErr},
		{name: "database failure removes new object", persistErr: persistErr, wantRemoved: []string{"new.docx"}, wantErr: persistErr},
		{name: "database and rollback cleanup errors are joined", persistErr: persistErr, removeErr: removeErr, wantRemoved: []string{"new.docx"}, wantErr: persistErr},
		{name: "success removes old object", persistOldPath: "old.docx", wantRemoved: []string{"old.docx"}},
		{name: "old cleanup failure does not turn commit into failure", persistOldPath: "old.docx", removeErr: removeErr, wantRemoved: []string{"old.docx"}, wantCleanupErr: true},
		{name: "first upload has no old object", persistOldPath: ""},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			persistCalled := false
			var removed []string
			cleanupErr, err := replaceStoredObject(
				"new.docx",
				func() error { return test.uploadErr },
				func() (string, error) {
					persistCalled = true
					return test.persistOldPath, test.persistErr
				},
				func(path string) error {
					removed = append(removed, path)
					return test.removeErr
				},
			)

			if test.uploadErr != nil && persistCalled {
				t.Fatal("persist called after upload failure")
			}
			if !reflect.DeepEqual(removed, test.wantRemoved) {
				t.Fatalf("removed = %#v, want %#v", removed, test.wantRemoved)
			}
			if test.wantErr != nil && !errors.Is(err, test.wantErr) {
				t.Fatalf("error = %v, want %v", err, test.wantErr)
			}
			if test.wantErr == nil && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if (cleanupErr != nil) != test.wantCleanupErr {
				t.Fatalf("cleanup error = %v, want present %v", cleanupErr, test.wantCleanupErr)
			}
			if test.persistErr != nil && test.removeErr != nil && !errors.Is(err, removeErr) {
				t.Fatalf("joined error does not contain cleanup error: %v", err)
			}
		})
	}
}
