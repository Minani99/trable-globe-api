package com.travelglobe.trableglobeapi.global.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Adds a safe correlation ID and logs failed or unusually slow requests. */
@Component
public class RequestTelemetryFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String CF_RAY_HEADER = "CF-Ray";
    private static final Pattern SAFE_TRACE_VALUE = Pattern.compile("[A-Za-z0-9._:-]{1,100}");
    private static final Logger log = LoggerFactory.getLogger(RequestTelemetryFilter.class);

    private final long slowRequestMs;

    public RequestTelemetryFilter(
            @Value("${travel-globe.observability.slow-request-ms:1000}") long slowRequestMs) {
        this.slowRequestMs = slowRequestMs;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = safeHeader(request.getHeader(REQUEST_ID_HEADER));
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }
        String cfRay = safeHeader(request.getHeader(CF_RAY_HEADER));

        MDC.put("requestId", requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            if (response.getStatus() >= 500) {
                log.warn("Request failed method={} path={} status={} durationMs={} cfRay={}",
                        request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs, cfRay);
            } else if (durationMs >= slowRequestMs) {
                log.info("Slow request method={} path={} status={} durationMs={} cfRay={}",
                        request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs, cfRay);
            } else {
                log.debug("Request completed method={} path={} status={} durationMs={}",
                        request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs);
            }
            MDC.remove("requestId");
        }
    }

    private String safeHeader(String value) {
        return value != null && SAFE_TRACE_VALUE.matcher(value).matches() ? value : null;
    }
}
