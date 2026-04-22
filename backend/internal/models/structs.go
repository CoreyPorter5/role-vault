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
