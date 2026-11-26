package com.travelglobe.trableglobeapi.feedback;

import com.travelglobe.trableglobeapi.auth.service.AccountMailService;
import com.travelglobe.trableglobeapi.global.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BetaFeedbackController {
    private final AccountMailService mail;
    private long windowStart;
    private int attempts;

    public BetaFeedbackController(AccountMailService mail) {
        this.mail = mail;
    }

    public record Report(@NotNull UUID submissionId, @NotBlank @Size(max = 5000) String text) {}

    @PostMapping("/api/feedback")
    public ResponseEntity<ApiResponse<Void>> submit(@Valid @RequestBody Report report) {
        if (!reserveAttempt()) {
            return ResponseEntity.status(429).header("Retry-After", "60")
                    .body(ApiResponse.failure("잠시 후 다시 보내 주세요.", null));
        }
        if (!mail.sendFeedback(report.text(), report.submissionId())) {
            return ResponseEntity.status(503).body(ApiResponse.failure("메일을 전송할 수 없습니다.", null));
        }
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private synchronized boolean reserveAttempt() {
        long now = System.currentTimeMillis();
        if (now - windowStart >= 60_000) {
            windowStart = now;
            attempts = 0;
        }
        if (attempts >= 10) return false;
        attempts++;
        return true;
    }
}
