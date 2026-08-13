package handlers

import (
	"strings"
	"testing"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func TestValidateCoverLetterAcceptsFocusedOnePageLetter(t *testing.T) {
	words := strings.Fields(strings.Repeat("supported evidence ", 135))
	letter := models.CoverLetter{
		CandidateName:    "Jordan Lee",
		CompanyName:      "Example Company",
		Salutation:       "Dear Hiring Manager",
		OpeningParagraph: strings.Join(words[:60], " "),
		BodyParagraphs: []string{
			strings.Join(words[60:150], " "),
			strings.Join(words[150:240], " "),
		},
		ClosingParagraph: strings.Join(words[240:], " "),
		SignOff:          "Kind regards",
	}
	if err := validateCoverLetter(letter); err != nil {
		t.Fatalf("valid cover letter rejected: %v", err)
	}
}

func TestValidateCoverLetterRejectsMissingEvidenceParagraph(t *testing.T) {
	letter := models.CoverLetter{
		CandidateName:    "Jordan Lee",
		CompanyName:      "Example Company",
		Salutation:       "Dear Hiring Manager",
		OpeningParagraph: strings.Repeat("opening ", 80),
		BodyParagraphs:   []string{strings.Repeat("evidence ", 100)},
		ClosingParagraph: strings.Repeat("closing ", 60),
		SignOff:          "Kind regards",
	}
	if err := validateCoverLetter(letter); err == nil {
		t.Fatal("cover letter with one evidence paragraph was accepted")
	}
}
