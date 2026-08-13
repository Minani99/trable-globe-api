package com.travelglobe.trableglobeapi.auth.service;

import com.travelglobe.trableglobeapi.auth.repository.AccountActionTokenRepository;
import com.travelglobe.trableglobeapi.auth.repository.AuthSessionRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Removes expired authentication material after a short incident-audit window. */
@Service
public class AuthDataCleanupService {

    private static final Logger log = LoggerFactory.getLogger(AuthDataCleanupService.class);

    private final AuthSessionRepository sessionRepository;
    private final AccountActionTokenRepository actionTokenRepository;
    private final long retentionDays;

    public AuthDataCleanupService(AuthSessionRepository sessionRepository,
                                  AccountActionTokenRepository actionTokenRepository,
                                  @Value("${travel-globe.auth.cleanup-retention-days:7}") long retentionDays) {
        this.sessionRepository = sessionRepository;
        this.actionTokenRepository = actionTokenRepository;
        this.retentionDays = retentionDays;
    }

    @Scheduled(cron = "${travel-globe.auth.cleanup-cron:0 17 3 * * *}", zone = "UTC")
    @Transactional
    public void removeStaleAuthenticationData() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        int sessions = sessionRepository.deleteStale(cutoff);
        int actionTokens = actionTokenRepository.deleteStale(cutoff);

        if (sessions > 0 || actionTokens > 0) {
            log.info("Removed stale authentication data sessions={} actionTokens={}", sessions, actionTokens);
        }
    }
}
