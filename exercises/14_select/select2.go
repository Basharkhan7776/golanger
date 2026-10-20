package main

import (
	"testing"
	"time"
)

func ReceiveWithTimeout(ch <-chan string, d time.Duration) string {
	// TODO: Use select with time.After(d)
	return ""
}

func TestReceiveWithTimeout(t *testing.T) {
	ch := make(chan string)
	if ReceiveWithTimeout(ch, 10*time.Millisecond) != "timeout" {
		t.Errorf("expected timeout")
	}
}
