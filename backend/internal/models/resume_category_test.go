package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestResumeCategoryValidationAndVersionMapping(t *testing.T) {
	categories := []ResumeCategory{
		ResumeCategoryTechnologyProductData,
		ResumeCategoryFinanceAccounting,
		ResumeCategorySalesMarketing,
		ResumeCategoryLegal,
		ResumeCategoryHumanResourcesAdminOperations,
		ResumeCategoryHospitalityRetailCustomerService,
		ResumeCategoryGeneralProfessionalOther,
	}

	for _, category := range categories {
		if !category.Valid() {
			t.Fatalf("category %q should be valid", category)
		}
		templateVersion := string(category) + "_v2"
		if category == ResumeCategoryTechnologyProductData {
			templateVersion = string(category) + "_v1"
		}
		if category.TemplateVersion() != templateVersion {
			t.Fatalf("category %q template = %q, want %q", category, category.TemplateVersion(), templateVersion)
		}
		if !ValidResumeProfileSelection(category, category.CurrentProfileVersion(), templateVersion) {
			t.Fatalf("category %q should accept its current profile selection", category)
		}
		if category.FirstProfileVersion() == 1 {
			if !ValidResumeProfileSelection(category, 1, string(category)+"_v1") {
				t.Fatalf("category %q should preserve released v1 selections", category)
			}
		}
	}
	if ValidResumeProfileSelection(ResumeCategoryLegal, 1, "legal_v1") {
		t.Fatal("legal v1 was never released and should be rejected")
	}

	if ResumeCategory("custom").Valid() {
		t.Fatal("custom category should be rejected")
	}
	if ValidResumeProfileSelection(ResumeCategoryTechnologyProductData, 2, "technology_product_data_v2") {
		t.Fatal("unsupported profile version should be rejected")
	}
	if ValidResumeProfileSelection(ResumeCategoryTechnologyProductData, 1, "finance_accounting_v1") {
		t.Fatal("mismatched template version should be rejected")
	}
}

func TestTailoredResumeJSONKeepsV2CredentialsField(t *testing.T) {
	payload, err := json.Marshal(TailoredResume{})
	if err != nil {
		t.Fatalf("marshal tailored resume: %v", err)
	}
	if !strings.Contains(string(payload), `"credentials":null`) {
		t.Fatalf("v2 strict schema requires an explicit credentials field, got %s", payload)
	}
}
