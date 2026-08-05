package resumeupload

import (
	"archive/zip"
	"bytes"
	"errors"
	"io"
	"mime/multipart"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPrepareDOCXValidatesAndExtractsText(t *testing.T) {
	file, header := multipartDOCXFile(t, "C:\\fakepath\\Master Resume.DOCX", DOCXMIMEType, validDOCX(t, "Corey Porter"))
	defer file.Close()

	prepared, err := PrepareDOCX(file, header, true)
	if err != nil {
		t.Fatalf("PrepareDOCX() error = %v", err)
	}
	if prepared.OriginalFilename != "Master Resume.DOCX" {
		t.Fatalf("OriginalFilename = %q", prepared.OriginalFilename)
	}
	if prepared.Plaintext != "Corey Porter" {
		t.Fatalf("Plaintext = %q", prepared.Plaintext)
	}
	if _, err := os.Stat(prepared.TempPath); err != nil {
		t.Fatalf("prepared temporary file does not exist: %v", err)
	}
	if err := prepared.Cleanup(); err != nil {
		t.Fatalf("Cleanup() error = %v", err)
	}
	if _, err := os.Stat(prepared.TempPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("temporary file still exists after cleanup: %v", err)
	}
}

func TestPrepareDOCXRejectsUnsafeInputs(t *testing.T) {
	tests := []struct {
		name        string
		filename    string
		contentType string
		content     []byte
		extractText bool
		wantErr     error
	}{
		{name: "wrong extension", filename: "resume.pdf", contentType: DOCXMIMEType, content: validDOCX(t, "text"), wantErr: ErrUnsupportedFile},
		{name: "wrong declared MIME", filename: "resume.docx", contentType: "application/pdf", content: validDOCX(t, "text"), wantErr: ErrUnsupportedFile},
		{name: "not a zip", filename: "resume.docx", contentType: DOCXMIMEType, content: []byte("not a docx"), wantErr: ErrInvalidDOCX},
		{name: "missing document", filename: "resume.docx", contentType: DOCXMIMEType, content: docxArchive(t, map[string]string{"[Content_Types].xml": contentTypesXML}), wantErr: ErrInvalidDOCX},
		{name: "malformed document XML", filename: "resume.docx", contentType: DOCXMIMEType, content: docxArchive(t, map[string]string{"[Content_Types].xml": contentTypesXML, "word/document.xml": "<w:document>"}), wantErr: ErrInvalidDOCX},
		{name: "archive traversal", filename: "resume.docx", contentType: DOCXMIMEType, content: docxArchive(t, map[string]string{"[Content_Types].xml": contentTypesXML, "word/document.xml": documentXML("text"), "../outside": "bad"}), wantErr: ErrInvalidDOCX},
		{name: "empty master resume", filename: "resume.docx", contentType: DOCXMIMEType, content: validDOCX(t, ""), extractText: true, wantErr: ErrEmptyResume},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			file, header := multipartDOCXFile(t, test.filename, test.contentType, test.content)
			defer file.Close()
			prepared, err := PrepareDOCX(file, header, test.extractText)
			if prepared != nil {
				defer prepared.Cleanup()
			}
			if !errors.Is(err, test.wantErr) {
				t.Fatalf("PrepareDOCX() error = %v, want %v", err, test.wantErr)
			}
		})
	}
}

func TestPrepareDOCXRejectsFileOverLimitWithoutReadingIt(t *testing.T) {
	file, header := multipartDOCXFile(t, "resume.docx", DOCXMIMEType, validDOCX(t, "text"))
	defer file.Close()
	header.Size = MaxDOCXBytes + 1
	if _, err := PrepareDOCX(file, header, false); !errors.Is(err, ErrFileTooLarge) {
		t.Fatalf("PrepareDOCX() error = %v, want %v", err, ErrFileTooLarge)
	}
}

func TestPrepareDOCXAcceptsGenericBrowserMIMEAfterContentValidation(t *testing.T) {
	for _, contentType := range []string{"", "application/octet-stream", "application/zip"} {
		file, header := multipartDOCXFile(t, "resume.docx", contentType, validDOCX(t, "text"))
		prepared, err := PrepareDOCX(file, header, false)
		file.Close()
		if err != nil {
			t.Fatalf("PrepareDOCX(%q) error = %v", contentType, err)
		}
		prepared.Cleanup()
	}
}

func multipartDOCXFile(t *testing.T, filename, contentType string, content []byte) (multipart.File, *multipart.FileHeader) {
	t.Helper()
	filePath := filepath.Join(t.TempDir(), "upload")
	if err := os.WriteFile(filePath, content, 0o600); err != nil {
		t.Fatalf("write test upload: %v", err)
	}
	file, err := os.Open(filePath)
	if err != nil {
		t.Fatalf("open test upload: %v", err)
	}
	header := &multipart.FileHeader{
		Filename: filename,
		Header:   make(textproto.MIMEHeader),
		Size:     int64(len(content)),
	}
	if contentType != "" {
		header.Header.Set("Content-Type", contentType)
	}
	return file, header
}

const contentTypesXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

func validDOCX(t *testing.T, text string) []byte {
	t.Helper()
	return docxArchive(t, map[string]string{
		"[Content_Types].xml": contentTypesXML,
		"word/document.xml":   documentXML(text),
	})
}

func documentXML(text string) string {
	var escaped bytes.Buffer
	if err := xmlEscape(&escaped, text); err != nil {
		panic(err)
	}
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>` +
		escaped.String() + `</w:t></w:r></w:p></w:body></w:document>`
}

func xmlEscape(writer io.Writer, value string) error {
	replacer := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;", "'", "&apos;")
	_, err := io.WriteString(writer, replacer.Replace(value))
	return err
}

func docxArchive(t *testing.T, files map[string]string) []byte {
	t.Helper()
	var output bytes.Buffer
	archive := zip.NewWriter(&output)
	for name, content := range files {
		entry, err := archive.Create(name)
		if err != nil {
			t.Fatalf("create zip entry: %v", err)
		}
		if _, err := io.WriteString(entry, content); err != nil {
			t.Fatalf("write zip entry: %v", err)
		}
	}
	if err := archive.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	return output.Bytes()
}
