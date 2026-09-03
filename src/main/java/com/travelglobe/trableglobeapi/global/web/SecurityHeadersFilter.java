package com.travelglobe.trableglobeapi.global.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Baseline response headers for the API.
 *
 * <p>The frontend sets these at the edge, but this host answers on its own domain and had
 * none of them - anything fetched straight from the API arrived without even
 * {@code nosniff}. The set is deliberately small: this origin serves JSON to scripts, so
 * the framing and script-source rules that matter for a page do not apply here.
 */
@Component
@Order(SecurityHeadersFilter.ORDER)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    /** Ahead of the telemetry filter so the headers are present even on an error path. */
    static final int ORDER = -100;

    /** Two years, matching the frontend, so the whole product is preloadable. */
    private static final String HSTS = "max-age=63072000; includeSubDomains";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        // No API response is a document, so nothing here should ever be framed or sniffed
        // into one.
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
        response.setHeader("Referrer-Policy", "no-referrer");

        // Only meaningful over TLS, and asserting it on plain HTTP is ignored anyway - but
        // sending it locally would also pin developers' browsers to https://localhost.
        if (request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"))) {
            response.setHeader("Strict-Transport-Security", HSTS);
        }

        filterChain.doFilter(request, response);
    }
}
