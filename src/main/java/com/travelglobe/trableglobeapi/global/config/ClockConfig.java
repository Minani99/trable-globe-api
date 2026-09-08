package com.travelglobe.trableglobeapi.global.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Single source of "today" for business rules such as "a trip can be published only after
 * it has ended".
 *
 * <p>Injecting a {@link Clock} instead of calling {@code LocalDate.now(ZoneId.of(...))}
 * keeps the timezone in configuration and lets tests pin the date.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock(@Value("${travel-globe.timezone:Asia/Seoul}") String timezone) {
        return Clock.system(ZoneId.of(timezone));
    }
}

