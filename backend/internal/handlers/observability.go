package handlers

import (
	"net/http"

	"github.com/CoreyPorter5/seek-sync/backend/internal/observability"
)

func captureHandlerError(r *http.Request, code observability.ErrorCode, err error, area, action string) {
	observability.CaptureRequestError(r, code, err, observability.Operation{
		Area:   area,
		Action: action,
	})
}
