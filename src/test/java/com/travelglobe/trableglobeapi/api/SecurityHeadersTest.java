package com.travelglobe.trableglobeapi.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The API answers on its own origin, so it carries its own baseline headers rather than
 * relying on the ones the frontend sets at the edge.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityHeadersTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("모든 응답에 기본 보안 헤더가 붙는다")
    void everyResponseCarriesTheBaselineHeaders() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"));
    }

    @Test
    @DisplayName("오류 응답에도 헤더가 빠지지 않는다")
    void errorResponsesKeepTheHeaders() throws Exception {
        // The filter runs ahead of the handlers, so a 404 is covered too - the case that
        // is easiest to leave uncovered when headers are added per controller.
        mockMvc.perform(get("/api/profiles/nobody"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    @DisplayName("평문 HTTP 에는 HSTS 를 보내지 않는다")
    void plainHttpDoesNotAssertHsts() throws Exception {
        // Pinning localhost to HTTPS in a developer's browser is a memorable way to
        // break a machine, so the header is conditional on the request being secure.
        mockMvc.perform(get("/api/health"))
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }

    @Test
    @DisplayName("프록시 뒤 HTTPS 요청에는 HSTS 를 보낸다")
    void forwardedHttpsGetsHsts() throws Exception {
        mockMvc.perform(get("/api/health").header("X-Forwarded-Proto", "https"))
                .andExpect(header().string("Strict-Transport-Security",
                        "max-age=63072000; includeSubDomains"));
    }
}
