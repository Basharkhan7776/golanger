package main

import "testing"

func DayType(day string) string {
	// TODO: Implement switch for weekend vs weekday
	return ""
}

func TestDayType(t *testing.T) {
	if DayType("Saturday") != "weekend" || DayType("Sunday") != "weekend" {
		t.Errorf("expected weekend")
	}
	if DayType("Wednesday") != "weekday" {
		t.Errorf("expected weekday")
	}
}
