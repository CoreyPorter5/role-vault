package db

import (
	"context"
	"fmt"

	"github.com/CoreyPorter5/seek-sync/backend/internal/models"
)

func GetResumeGenerationUsage(userID string) (models.ResumeGenerationUsage, error) {
	var resumeGenerationUsage models.ResumeGenerationUsage
	query := `SELECT resume_generations_used, resume_generation_limit, COALESCE(resume_usage_period_start::text, ''), COALESCE(resume_usage_period_end::text, '') FROM profiles WHERE user_id = $1`
	err := Conn.QueryRow(context.Background(), query, userID).Scan(
		&resumeGenerationUsage.Used,
		&resumeGenerationUsage.Limit,
		&resumeGenerationUsage.PeriodStart,
		&resumeGenerationUsage.PeriodEnd,
	)
	if err != nil {
		return resumeGenerationUsage, err
	}

	resumeGenerationUsage.Remaining = resumeGenerationUsage.Limit - resumeGenerationUsage.Used
	if resumeGenerationUsage.Remaining < 0 {
		resumeGenerationUsage.Remaining = 0
	}
	resumeGenerationUsage.CanGenerate = resumeGenerationUsage.Remaining > 0
	return resumeGenerationUsage, nil
}

func IncrementResumeGenerationsUsed(userID string) (bool, error) {
	query := `UPDATE profiles SET resume_generations_used = resume_generations_used + 1, updated_at = now() WHERE user_id = $1 AND resume_generations_used < resume_generation_limit`
	commandTag, err := Conn.Exec(context.Background(), query, userID)

	if err != nil {
		return false, err
	}

	if commandTag.RowsAffected() == 0 {
		fmt.Printf("No more generations left. Increment failed\n")
		return false, nil
	}

	return true, nil
}
