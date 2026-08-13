//Go structs go here to match zod schema

package models

import "encoding/json"

type Job struct {
	JobID       string  `json:"jobId"`
	JobTitle    string  `json:"jobTitle"`
	Logo        *string `json:"companyLogo"`
	CompanyName string  `json:"companyName"`
	Pay         *string `json:"jobPay"`
	Description string  `json:"jobDescription"`
	Location    string  `json:"location"`
	JobType     *string `json:"jobType"`
	DateSynced  string  `json:"dateSynced"`
	Status      string  `json:"jobStatus"`
}

type JobStatus string

const (
	Saved        JobStatus = "Saved"
	Applied      JobStatus = "Applied"
	Interviewing JobStatus = "Interviewing"
	Offer        JobStatus = "Offer"
	Rejected     JobStatus = "Rejected"
	Accepted     JobStatus = "Accepted"
)

func (status JobStatus) Valid() bool {
	switch status {
	case Saved, Applied, Interviewing, Offer, Rejected, Accepted:
		return true
	default:
		return false
	}
}

type ResumeCategory string

const (
	ResumeCategoryTechnologyProductData            ResumeCategory = "technology_product_data"
	ResumeCategoryFinanceAccounting                ResumeCategory = "finance_accounting"
	ResumeCategorySalesMarketing                   ResumeCategory = "sales_marketing"
	ResumeCategoryHumanResourcesAdminOperations    ResumeCategory = "human_resources_admin_operations"
	ResumeCategoryHospitalityRetailCustomerService ResumeCategory = "hospitality_retail_customer_service"
	ResumeCategoryGeneralProfessionalOther         ResumeCategory = "general_professional_other"
)

func (category ResumeCategory) Valid() bool {
	switch category {
	case ResumeCategoryTechnologyProductData,
		ResumeCategoryFinanceAccounting,
		ResumeCategorySalesMarketing,
		ResumeCategoryHumanResourcesAdminOperations,
		ResumeCategoryHospitalityRetailCustomerService,
		ResumeCategoryGeneralProfessionalOther:
		return true
	default:
		return false
	}
}

const CurrentResumeProfileVersion = 1

func (category ResumeCategory) TemplateVersion() string {
	if !category.Valid() {
		return ""
	}
	return string(category) + "_v1"
}

func ValidResumeProfileSelection(category ResumeCategory, profileVersion int, templateVersion string) bool {
	return category.Valid() &&
		profileVersion == CurrentResumeProfileVersion &&
		templateVersion == category.TemplateVersion()
}

type JobResumeCategory struct {
	JobID             string          `json:"job_id"`
	Status            string          `json:"status"`
	Category          *ResumeCategory `json:"category"`
	Source            *string         `json:"source"`
	Confidence        *float64        `json:"confidence"`
	ClassifierModel   *string         `json:"classifier_model,omitempty"`
	ClassifierVersion *int            `json:"classifier_version,omitempty"`
	FailureCode       *string         `json:"failure_code,omitempty"`
	StartedAt         *string         `json:"started_at,omitempty"`
	ResolvedAt        *string         `json:"resolved_at,omitempty"`
	Claimed           bool            `json:"claimed,omitempty"`
	JobTitle          string          `json:"job_title,omitempty"`
	JobDescription    string          `json:"job_description,omitempty"`
}

type SetJobResumeCategoryRequest struct {
	Category ResumeCategory `json:"category"`
}

type ClaimJobResumeCategoryRequest struct {
	ClassifierModel   string `json:"classifier_model"`
	ClassifierVersion int    `json:"classifier_version"`
}

type CompleteJobResumeCategoryRequest struct {
	Category   ResumeCategory `json:"category"`
	Confidence float64        `json:"confidence"`
}

type FailJobResumeCategoryRequest struct {
	FailureCode string   `json:"failure_code"`
	Confidence  *float64 `json:"confidence,omitempty"`
}

type Status struct {
	Status JobStatus `json:"jobStatus"`
}

type Resume struct {
	FileName    string `json:"fileName"`
	Plaintext   string `json:"plaintext"`
	MimeType    string `json:"mimeType"`
	StoragePath string `json:"storagePath"`
	UpdatedAt   string `json:"updatedAt"`
	CreatedAt   string `json:"createdAt"`
}

type GenerateResumeContext struct {
	ResumePlaintext string `json:"resumePlaintext"`
	Job             Job    `json:"job"`
}

type GenerateCoverLetterContext struct {
	ResumePlaintext string          `json:"resumePlaintext"`
	Job             Job             `json:"job"`
	TailoredResume  *TailoredResume `json:"tailoredResume,omitempty"`
}

type TailoredResume struct {
	FullName            string       `json:"fullName" validate:"required,max=80"`
	ProfessionalTitle   string       `json:"professionalTitle" validate:"required,max=80"`
	Contact             Contact      `json:"contact" validate:"required"`
	ProfessionalSummary string       `json:"professionalSummary" validate:"required,max=550"`
	Skills              []string     `json:"skills" validate:"required,max=15,dive,max=80"`
	Experience          []Experience `json:"experience" validate:"required,max=4,dive"`
	Projects            []Project    `json:"projects" validate:"omitempty,max=3,dive"`
	Education           []Education  `json:"education" validate:"required,max=3,dive"`
}

type Contact struct {
	Location      *string `json:"location" validate:"omitempty,max=80"`
	Phone         *string `json:"phone" validate:"omitempty,max=40"`
	Email         *string `json:"email" validate:"omitempty,email,max=120"`
	LinkedIn      *string `json:"linkedin" validate:"omitempty,max=120"`
	GitHub        *string `json:"github" validate:"omitempty,max=120"`
	PortfolioSite *string `json:"portfolioSite" validate:"omitempty,max=120"`
}

type Experience struct {
	Title    string   `json:"title" validate:"required,max=100"`
	Company  string   `json:"company" validate:"required,max=100"`
	Location *string  `json:"location" validate:"omitempty,max=100"`
	Dates    *string  `json:"dates" validate:"omitempty,max=40"`
	Bullets  []string `json:"bullets" validate:"required,min=2,max=6,dive,max=220"`
}

type Project struct {
	Name         string   `json:"name" validate:"required,max=100"`
	Technologies []string `json:"technologies" validate:"omitempty,max=8,dive,max=80"`
	Bullets      []string `json:"bullets" validate:"required,min=2,max=3,dive,max=220"`
}

type Education struct {
	Institution string   `json:"institution" validate:"required,max=100"`
	Degree      *string  `json:"degree" validate:"omitempty,max=120"`
	Dates       *string  `json:"dates" validate:"omitempty,max=50"`
	Details     []string `json:"details" validate:"omitempty,max=5,dive,max=160"`
}

type CoverLetter struct {
	CandidateName    string             `json:"candidateName"`
	CandidateContact CoverLetterContact `json:"candidateContact"`
	RecipientName    *string            `json:"recipientName"`
	RecipientTitle   *string            `json:"recipientTitle"`
	CompanyName      string             `json:"companyName"`
	Salutation       string             `json:"salutation"`
	OpeningParagraph string             `json:"openingParagraph"`
	BodyParagraphs   []string           `json:"bodyParagraphs"`
	ClosingParagraph string             `json:"closingParagraph"`
	SignOff          string             `json:"signOff"`
}

type CoverLetterContact struct {
	Location *string `json:"location"`
	Phone    *string `json:"phone"`
	Email    *string `json:"email"`
}

type JobLibraryItem struct {
	JobID       string               `json:"jobId"`
	JobTitle    string               `json:"jobTitle"`
	Logo        *string              `json:"companyLogo"`
	CompanyName string               `json:"companyName"`
	Location    string               `json:"location"`
	DateSynced  string               `json:"dateSynced"`
	Status      string               `json:"jobStatus"`
	Resume      GeneratedResume      `json:"resume"`
	CoverLetter GeneratedCoverLetter `json:"coverLetter"`
}

type GeneratedResume struct {
	Exists           bool           `json:"exists"`
	OriginalFilename string         `json:"originalFilename,omitempty"`
	StoragePath      string         `json:"storagePath,omitempty"`
	UpdatedAt        string         `json:"updatedAt,omitempty"`
	ResumeCategory   ResumeCategory `json:"resumeCategory,omitempty"`
	ProfileVersion   int            `json:"profileVersion,omitempty"`
	TemplateVersion  string         `json:"templateVersion,omitempty"`
}

type GeneratedCoverLetter struct {
	Status          string `json:"status"`
	UpdatedAt       string `json:"updatedAt,omitempty"`
	ExpiresAt       string `json:"expiresAt,omitempty"`
	TemplateVersion string `json:"templateVersion,omitempty"`
}

type CoverLetterDocument struct {
	CoverLetter     CoverLetter `json:"coverLetter"`
	TemplateVersion string      `json:"templateVersion"`
	UpdatedAt       string      `json:"updatedAt"`
	ExpiresAt       *string     `json:"expiresAt,omitempty"`
}

type UpdateResumeRequest struct {
	Plaintext string `json:"plaintext"`
}

type Profile struct {
	UserID                      string  `json:"user_id"`
	Email                       string  `json:"email"`
	CreatedAt                   string  `json:"created_at"`
	UpdatedAt                   string  `json:"updated_at"`
	FirstName                   string  `json:"first_name"`
	LastName                    string  `json:"last_name"`
	Plan                        string  `json:"plan"`
	SubscriptionStatus          string  `json:"subscription_status"`
	StripeCustomerID            *string `json:"stripe_customer_id"`
	StripeSubscriptionID        *string `json:"stripe_subscription_id"`
	StripePaymentStatus         *string `json:"stripe_payment_status"`
	ResumeGenerationsUsed       int     `json:"resume_generations_used"`
	ResumeGenerationsLimit      int     `json:"resume_generations_limit"`
	CoverLetterGenerationsUsed  int     `json:"cover_letter_generations_used"`
	CoverLetterGenerationsLimit int     `json:"cover_letter_generations_limit"`
	ResumeUsagePeriodStart      *string `json:"resume_usage_period_start"`
	ResumeUsagePeriodEnd        *string `json:"resume_usage_period_end"`
}

type ResumeGenerationUsage struct {
	Used        int    `json:"used"`
	Limit       int    `json:"limit"`
	Remaining   int    `json:"remaining"`
	CanGenerate bool   `json:"can_generate"`
	PeriodStart string `json:"period_start"`
	PeriodEnd   string `json:"period_end"`
}

type ResumeGenerationAttempt struct {
	GenerationID    string                `json:"generation_id"`
	JobID           string                `json:"job_id"`
	Status          string                `json:"status"`
	Created         bool                  `json:"created"`
	Resume          json.RawMessage       `json:"resume,omitempty"`
	FailureCode     *string               `json:"failure_code,omitempty"`
	AttemptCount    int                   `json:"attempt_count"`
	RepairAttempted bool                  `json:"repair_attempted"`
	ResumeCategory  ResumeCategory        `json:"resume_category"`
	ProfileVersion  int                   `json:"profile_version"`
	TemplateVersion string                `json:"template_version"`
	Usage           ResumeGenerationUsage `json:"usage"`
}

type ReserveResumeGenerationRequest struct {
	GenerationID    string         `json:"generation_id"`
	JobID           string         `json:"job_id"`
	Model           string         `json:"model"`
	ResumeCategory  ResumeCategory `json:"resume_category"`
	ProfileVersion  int            `json:"profile_version"`
	TemplateVersion string         `json:"template_version"`
}

type CompleteResumeGenerationRequest struct {
	Resume          TailoredResume  `json:"resume"`
	TokenUsage      json.RawMessage `json:"token_usage"`
	AttemptCount    int             `json:"attempt_count"`
	RepairAttempted bool            `json:"repair_attempted"`
}

type FailResumeGenerationRequest struct {
	FailureCode     string          `json:"failure_code"`
	FailureDetail   string          `json:"failure_detail"`
	TokenUsage      json.RawMessage `json:"token_usage"`
	AttemptCount    int             `json:"attempt_count"`
	RepairAttempted bool            `json:"repair_attempted"`
}

type CoverLetterGenerationAttempt struct {
	GenerationID    string                `json:"generation_id"`
	JobID           string                `json:"job_id"`
	Status          string                `json:"status"`
	Created         bool                  `json:"created"`
	CoverLetter     json.RawMessage       `json:"cover_letter,omitempty"`
	FailureCode     *string               `json:"failure_code,omitempty"`
	AttemptCount    int                   `json:"attempt_count"`
	RepairAttempted bool                  `json:"repair_attempted"`
	TemplateVersion string                `json:"template_version"`
	Usage           ResumeGenerationUsage `json:"usage"`
}

type ReserveCoverLetterGenerationRequest struct {
	GenerationID    string `json:"generation_id"`
	JobID           string `json:"job_id"`
	Model           string `json:"model"`
	TemplateVersion string `json:"template_version"`
}

type CompleteCoverLetterGenerationRequest struct {
	CoverLetter     CoverLetter     `json:"cover_letter"`
	TokenUsage      json.RawMessage `json:"token_usage"`
	AttemptCount    int             `json:"attempt_count"`
	RepairAttempted bool            `json:"repair_attempted"`
}

type SaveCoverLetterRequest struct {
	CoverLetter CoverLetter `json:"cover_letter"`
}

type JobLibraryItemDraft struct {
	DraftID         string               `json:"draftId"`
	JobID           string               `json:"jobId"`
	JobTitle        string               `json:"jobTitle"`
	Logo            *string              `json:"companyLogo"`
	CompanyName     string               `json:"companyName"`
	Location        string               `json:"location"`
	DateSynced      string               `json:"dateSynced"`
	Status          string               `json:"jobStatus"`
	DraftCreatedAt  string               `json:"draftCreatedAt"`
	DraftUpdatedAt  string               `json:"draftUpdatedAt"`
	DraftExpiresAt  string               `json:"draftExpiresAt"`
	ResumeCategory  ResumeCategory       `json:"resumeCategory"`
	ProfileVersion  int                  `json:"profileVersion"`
	TemplateVersion string               `json:"templateVersion"`
	CoverLetter     GeneratedCoverLetter `json:"coverLetter"`
}
