package main

import "testing"

type Counter struct {
	Count int
}

func (c *Counter) Increment() {
	c.Count++
}

func TestPointerReceiver(t *testing.T) {
	c := &Counter{Count: 0}
	c.Increment()
	c.Increment()
	if c.Count != 2 {
		t.Errorf("expected count 2, got %d", c.Count)
	}
}
