package com.travelglobe.trableglobeapi.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables {@code @CreatedDate} / {@code @LastModifiedDate} population.
 *
 * <p>Kept separate from the application class so that slice tests can opt in or out.
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
