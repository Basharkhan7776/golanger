package main

import (
	"strings"
	"testing"
)

func NormalizeTag(tag string) string {
	lowered := strings.ToLower(tag)
	return strings.ReplaceAll(lowered, "-", "_")
}

func TestNormalizeTag(t *testing.T) {
	if NormalizeTag("GO-LANG-ROCKS") != "go_lang_rocks" {
		t.Errorf("normalization failed")
	}
}
