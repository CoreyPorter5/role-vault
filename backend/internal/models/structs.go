//Go structs go here to match zod schema

package models

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

type JobLibraryItem struct {
	JobID       string          `json:"jobId"`
	JobTitle    string          `json:"jobTitle"`
	Logo        *string         `json:"companyLogo"`
	CompanyName string          `json:"companyName"`
	Location    string          `json:"location"`
	DateSynced  string          `json:"dateSynced"`
	Status      string          `json:"jobStatus"`
	Resume      GeneratedResume `json:"resume"`
}

type GeneratedResume struct {
	Exists           bool   `json:"exists"`
	OriginalFilename string `json:"originalFilename,omitempty"`
	StoragePath      string `json:"storagePath,omitempty"`
	UpdatedAt        string `json:"updatedAt,omitempty"`
}

type UpdateResumeRequest struct {
	Plaintext string `json:"plaintext"`
}
