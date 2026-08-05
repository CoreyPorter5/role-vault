package db

import (
	"errors"
	"fmt"
)

// replaceStoredObject preserves the currently referenced object unless the new
// upload and its database update both succeed. Failure to remove an old,
// unreferenced object is reported separately because the new object is already
// committed and safe to use.
func replaceStoredObject(
	newPath string,
	upload func() error,
	persist func() (string, error),
	remove func(string) error,
) (oldObjectCleanupErr error, err error) {
	if err := upload(); err != nil {
		return nil, err
	}

	oldPath, err := persist()
	if err != nil {
		if cleanupErr := remove(newPath); cleanupErr != nil {
			return nil, errors.Join(err, fmt.Errorf("remove unreferenced new object: %w", cleanupErr))
		}
		return nil, err
	}

	if oldPath == "" || oldPath == newPath {
		return nil, nil
	}
	if err := remove(oldPath); err != nil {
		return fmt.Errorf("remove superseded object: %w", err), nil
	}
	return nil, nil
}
