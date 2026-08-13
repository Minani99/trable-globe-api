package com.travelglobe.trableglobeapi.auth.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.databind.ObjectMapper;

@Service
public class AccountMailService {

    private static final Logger log = LoggerFactory.getLogger(AccountMailService.class);
    private static final URI RESEND_EMAILS = URI.create("https://api.resend.com/emails");

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String publicBaseUrl;
    private final String from;

    public AccountMailService(ObjectMapper objectMapper,
                              @Value("${RESEND_API_KEY:}") String apiKey,
                              @Value("${travel-globe.mail.public-base-url:http://localhost:3000}") String publicBaseUrl,
                              @Value("${travel-globe.mail.from:no-reply@travel-globe.local}") String from) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        this.from = from;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    public void sendVerification(String email, String displayName, String rawToken) {
        String url = actionUrl("/verify-email", rawToken);
        send(email, "Travel Globe 이메일을 확인해 주세요", String.join("\n",
                displayName + "님, Travel Globe에 오신 것을 환영합니다.", "", "아래 링크에서 이메일 인증을 마쳐 주세요.", url,
                "", "이 링크는 24시간 동안 유효합니다."), url);
    }

    public void sendPasswordReset(String email, String displayName, String rawToken) {
        String url = actionUrl("/reset-password", rawToken);
        send(email, "Travel Globe 비밀번호 재설정", String.join("\n",
                displayName + "님, 비밀번호 재설정 요청을 받았습니다.", "", "아래 링크에서 새 비밀번호를 설정해 주세요.", url,
                "", "이 링크는 1시간 동안 유효합니다. 요청하지 않았다면 이 메일을 무시해 주세요."), url);
    }

    private void send(String email, String subject, String text, String developmentUrl) {
        if (!StringUtils.hasText(apiKey)) {
            log.info("Resend is not configured. Account action link for {}: {}", email, developmentUrl);
            return;
        }
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "from", from,
                    "to", List.of(email),
                    "subject", subject,
                    "text", text));
            HttpRequest request = HttpRequest.newBuilder(RESEND_EMAILS)
                    .timeout(Duration.ofSeconds(8))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "TravelGlobe/1.0")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Resend rejected account email to {} with status {}", email, response.statusCode());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("Account email to {} was interrupted", email, ex);
        } catch (Exception ex) {
            log.error("Could not send account email to {}", email, ex);
        }
    }

    private String actionUrl(String path, String rawToken) {
        return publicBaseUrl + path + "?token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
    }
}
