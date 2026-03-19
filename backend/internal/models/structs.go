//Go structs go here to match zod schema

package models

type Job struct {
	ID          string  `json:"jobID"`
	Title       string  `json:"jobTitle"`
	JobURL      string  `json:"jobUrl"`
	ApplyURL    string  `json:"applyUrl"`
	Logo        *string `json:"companyLogo"`
	CompanyName string  `json:"companyName"`
	Pay         *string `json:"jobPay"`
	Description string  `json:"jobDescription"`
	Location    string  `json:"location"`
	JobType     *string `json:"jobType"`
	DateSynced  string  `json:"dateSynced"`
	UserID      string  `json:"userId"`
}
