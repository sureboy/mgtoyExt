package WebRtc

import (
	"net/http"
	"testing"
)

func Test(t *testing.T) {
	err := http.ListenAndServe(":8088", http.HandlerFunc(RtcHttpHandle))
	if err != nil {
		t.Error(err)
	}
}
