package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDecodeCreditCheckoutRequest(t *testing.T) {
	tests := []struct {
		name string
		body string
		ok   bool
	}{
		{
			name: "100 credit pack",
			body: `{"pack_code":"credits_100","purchase_id":"550e8400-e29b-41d4-a716-446655440000"}`,
			ok:   true,
		},
		{
			name: "250 credit pack",
			body: `{"pack_code":"credits_250","purchase_id":"6ba7b810-9dad-11d1-80b4-00c04fd430c8"}`,
			ok:   true,
		},
		{name: "unknown pack", body: `{"pack_code":"credits_1000","purchase_id":"550e8400-e29b-41d4-a716-446655440000"}`},
		{name: "invalid purchase ID", body: `{"pack_code":"credits_100","purchase_id":"same-request"}`},
		{name: "unknown field", body: `{"pack_code":"credits_100","purchase_id":"550e8400-e29b-41d4-a716-446655440000","amount":1}`},
		{name: "trailing JSON", body: `{"pack_code":"credits_100","purchase_id":"550e8400-e29b-41d4-a716-446655440000"}{}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest("POST", "/api/v1/billing/create-checkout-session", strings.NewReader(test.body))
			response := httptest.NewRecorder()
			got, err := decodeCreditCheckoutRequest(response, request)
			if test.ok && err != nil {
				t.Fatalf("valid request was rejected: %v", err)
			}
			if !test.ok && err == nil {
				t.Fatalf("invalid request was accepted: %#v", got)
			}
		})
	}
}
