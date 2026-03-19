//Go structs go here to match zod schema

package models

type Job struct {
	JobID       string  `json:"jobId"`
	JobTitle    string  `json:"jobTitle"`
	JobURL      string  `json:"jobUrl"`
	ApplyURL    string  `json:"applyUrl"`
	Logo        *string `json:"companyLogo"`
	CompanyName string  `json:"companyName"`
	Pay         *string `json:"jobPay"`
	Description string  `json:"jobDescription"`
	Location    string  `json:"location"`
	JobType     *string `json:"jobType"`
	DateSynced  string  `json:"dateSynced"`
}
