package models

import "testing"

func TestResumeCategoryValidationAndVersionMapping(t *testing.T) {
	categories := []ResumeCategory{
		ResumeCategoryTechnologyProductData,
		ResumeCategoryFinanceAccounting,
		ResumeCategorySalesMarketing,
		ResumeCategoryHumanResourcesAdminOperations,
		ResumeCategoryHospitalityRetailCustomerService,
		ResumeCategoryGeneralProfessionalOther,
	}

	for _, category := range categories {
		if !category.Valid() {
			t.Fatalf("category %q should be valid", category)
		}
		templateVersion := string(category) + "_v1"
		if category.TemplateVersion() != templateVersion {
			t.Fatalf("category %q template = %q, want %q", category, category.TemplateVersion(), templateVersion)
		}
		if !ValidResumeProfileSelection(category, CurrentResumeProfileVersion, templateVersion) {
			t.Fatalf("category %q should accept its current profile selection", category)
		}
	}

	if ResumeCategory("custom").Valid() {
		t.Fatal("custom category should be rejected")
	}
	if ValidResumeProfileSelection(ResumeCategoryTechnologyProductData, 2, "technology_product_data_v1") {
		t.Fatal("unsupported profile version should be rejected")
	}
	if ValidResumeProfileSelection(ResumeCategoryTechnologyProductData, 1, "finance_accounting_v1") {
		t.Fatal("mismatched template version should be rejected")
	}
}
