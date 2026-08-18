package resumeupload

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"os"
	"path"
	"strings"

	"github.com/tenkoh/go-docc"
)

const (
	MaxDOCXBytes          int64 = 5 * 1024 * 1024
	MaxMultipartBodyBytes       = MaxDOCXBytes + 1024*1024
	MaxPlaintextBytes           = 2 * 1024 * 1024
	maxArchiveBytes       int64 = 64 * 1024 * 1024
	maxDocumentXMLBytes   int64 = 8 * 1024 * 1024
	maxContentTypesBytes  int64 = 1024 * 1024
	maxArchiveEntries           = 2048
	maxFilenameBytes            = 255

	DOCXMIMEType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

var (
	ErrFileTooLarge       = errors.New("resume must be 5 MiB or smaller")
	ErrUnsupportedFile    = errors.New("resume must be a DOCX file")
	ErrInvalidDOCX        = errors.New("resume is not a valid DOCX file")
	ErrEmptyResume        = errors.New("resume does not contain any readable text")
	ErrResumeTextTooLarge = errors.New("resume contains too much text")
	ErrInvalidFilename    = errors.New("resume filename is invalid")
)

// PreparedDOCX is a validated, bounded upload stored in a temporary file. The
// caller owns the file and must call Cleanup when it is no longer needed.
type PreparedDOCX struct {
	TempPath         string
	OriginalFilename string
	Plaintext        string
	Size             int64
}

func (p *PreparedDOCX) Cleanup() error {
	if p == nil || p.TempPath == "" {
		return nil
	}
	return os.Remove(p.TempPath)
}

// PrepareDOCX copies the upload through a hard size limit and validates the
// Office Open XML container before any external storage write occurs.
func PrepareDOCX(file multipart.File, header *multipart.FileHeader, extractText bool) (_ *PreparedDOCX, err error) {
	if file == nil || header == nil {
		return nil, ErrInvalidDOCX
	}
	if header.Size > MaxDOCXBytes {
		return nil, ErrFileTooLarge
	}

	filename, err := normalizeFilename(header.Filename)
	if err != nil {
		return nil, err
	}
	if !strings.EqualFold(path.Ext(filename), ".docx") {
		return nil, ErrUnsupportedFile
	}
	if !acceptedClientMIME(header.Header.Get("Content-Type")) {
		return nil, ErrUnsupportedFile
	}

	tmp, err := os.CreateTemp("", "seek-sync-resume-*.docx")
	if err != nil {
		return nil, fmt.Errorf("create temporary resume: %w", err)
	}
	tmpPath := tmp.Name()
	keepFile := false
	tmpClosed := false
	defer func() {
		if !tmpClosed {
			if closeErr := tmp.Close(); err == nil && closeErr != nil {
				err = fmt.Errorf("close temporary resume: %w", closeErr)
			}
		}
		if !keepFile {
			_ = os.Remove(tmpPath)
		}
	}()

	written, copyErr := io.Copy(tmp, io.LimitReader(file, MaxDOCXBytes+1))
	if copyErr != nil {
		return nil, fmt.Errorf("read resume upload: %w", copyErr)
	}
	if written > MaxDOCXBytes {
		return nil, ErrFileTooLarge
	}
	if written == 0 {
		return nil, ErrInvalidDOCX
	}
	if err := tmp.Sync(); err != nil {
		return nil, fmt.Errorf("flush temporary resume: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return nil, fmt.Errorf("close temporary resume: %w", err)
	}
	tmpClosed = true

	if err := validateDOCXArchive(tmpPath); err != nil {
		return nil, err
	}

	prepared := &PreparedDOCX{
		TempPath:         tmpPath,
		OriginalFilename: filename,
		Size:             written,
	}
	if extractText {
		plaintext, err := extractPlaintext(tmpPath)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidDOCX, err)
		}
		if plaintext == "" {
			return nil, ErrEmptyResume
		}
		if len(plaintext) > MaxPlaintextBytes {
			return nil, ErrResumeTextTooLarge
		}
		prepared.Plaintext = plaintext
	}

	keepFile = true
	return prepared, nil
}

func normalizeFilename(filename string) (string, error) {
	filename = strings.TrimSpace(strings.ReplaceAll(filename, "\\", "/"))
	filename = path.Base(filename)
	if filename == "" || filename == "." || filename == "/" || len(filename) > maxFilenameBytes {
		return "", ErrInvalidFilename
	}
	for _, character := range filename {
		if character < 0x20 || character == 0x7f {
			return "", ErrInvalidFilename
		}
	}
	return filename, nil
}

func acceptedClientMIME(contentType string) bool {
	if strings.TrimSpace(contentType) == "" {
		return true
	}
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return false
	}
	switch strings.ToLower(mediaType) {
	case DOCXMIMEType, "application/docx", "application/octet-stream", "application/zip", "application/x-zip-compressed":
		return true
	default:
		return false
	}
}

func validateDOCXArchive(filePath string) error {
	reader, err := zip.OpenReader(filePath)
	if err != nil {
		return ErrInvalidDOCX
	}
	defer reader.Close()

	if len(reader.File) == 0 || len(reader.File) > maxArchiveEntries {
		return ErrInvalidDOCX
	}

	var totalBytes uint64
	var contentTypes *zip.File
	var documentXML *zip.File
	for _, entry := range reader.File {
		name := entry.Name
		cleanName := path.Clean(name)
		if strings.Contains(name, "\\") || path.IsAbs(name) || cleanName == ".." || strings.HasPrefix(cleanName, "../") {
			return ErrInvalidDOCX
		}
		if entry.UncompressedSize64 > uint64(maxArchiveBytes)-totalBytes {
			return ErrInvalidDOCX
		}
		totalBytes += entry.UncompressedSize64
		switch name {
		case "[Content_Types].xml":
			contentTypes = entry
		case "word/document.xml":
			documentXML = entry
		}
	}
	if contentTypes == nil || documentXML == nil {
		return ErrInvalidDOCX
	}
	if contentTypes.UncompressedSize64 > uint64(maxContentTypesBytes) || documentXML.UncompressedSize64 > uint64(maxDocumentXMLBytes) {
		return ErrInvalidDOCX
	}

	contentTypeXML, err := readZipEntry(contentTypes, maxContentTypesBytes)
	if err != nil || !bytes.Contains(contentTypeXML, []byte("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml")) {
		return ErrInvalidDOCX
	}
	document, err := readZipEntry(documentXML, maxDocumentXMLBytes)
	if err != nil {
		return ErrInvalidDOCX
	}
	decoder := xml.NewDecoder(bytes.NewReader(document))
	for {
		if _, err := decoder.Token(); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return ErrInvalidDOCX
		}
	}
	return nil
}

func readZipEntry(entry *zip.File, limit int64) ([]byte, error) {
	reader, err := entry.Open()
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	content, err := io.ReadAll(io.LimitReader(reader, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(content)) > limit {
		return nil, ErrInvalidDOCX
	}
	return content, nil
}

func extractPlaintext(filePath string) (string, error) {
	reader, err := docc.NewReader(filePath)
	if err != nil {
		return "", err
	}
	defer reader.Close()

	parts, err := reader.ReadAll()
	if err != nil {
		return "", err
	}
	return cleanPlaintext(strings.Join(parts, "\n")), nil
}

func cleanPlaintext(text string) string {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	lines := strings.Split(text, "\n")
	for index, line := range lines {
		lines[index] = strings.TrimSpace(line)
	}
	text = strings.Join(lines, "\n")
	for strings.Contains(text, "\n\n\n") {
		text = strings.ReplaceAll(text, "\n\n\n", "\n\n")
	}
	return strings.TrimSpace(text)
}
