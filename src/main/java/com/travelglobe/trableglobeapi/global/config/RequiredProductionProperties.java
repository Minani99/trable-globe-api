package com.travelglobe.trableglobeapi.global.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

/**
 * Fails the {@code prod} profile with a readable message when required configuration is absent.
 *
 * <p>Without this, a missing {@code DB_URL} surfaces much later as
 * {@code IllegalArgumentException: 'url' must start with "jdbc"} from inside Hikari, which
 * says nothing about which variable was forgotten. Someone wiring up a hosting dashboard
 * should be told the variable name, not handed a connection-pool assertion.
 *
 * <p>Runs as an {@link EnvironmentPostProcessor} so the check happens before any bean -
 * including the DataSource - is created. Ordered last so that profile activation and
 * config data have already been resolved.
 *
 * <p>Registered in {@code META-INF/spring.factories}.
 */
public class RequiredProductionProperties implements EnvironmentPostProcessor, Ordered {

    private static final String PRODUCTION_PROFILE = "prod";

    /** Property name to the hint shown when it is missing. Order is the order reported. */
    private static final Map<String, String> REQUIRED = new LinkedHashMap<>();

    static {
        REQUIRED.put("DB_URL", "JDBC URL, e.g. jdbc:postgresql://host/travelglobe?sslmode=require");
        REQUIRED.put("DB_USERNAME", "database role");
        REQUIRED.put("DB_PASSWORD", "database password");
        REQUIRED.put("CORS_ALLOWED_ORIGINS", "frontend origin, e.g. https://travel-globe.vercel.app");
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!isProduction(environment)) {
            return;
        }

        List<String> missing = REQUIRED.keySet().stream()
                .filter(name -> !StringUtils.hasText(environment.getProperty(name)))
                .toList();

        if (!missing.isEmpty()) {
            throw new IllegalStateException(buildMessage(missing));
        }

        verifyJdbcUrl(environment.getProperty("DB_URL"));
    }

    /**
     * Rejects a native PostgreSQL connection string early.
     *
     * <p>Hosted database providers hand out {@code postgresql://user:pass@host/db}, which is
     * the natural thing to paste into DB_URL. The driver needs the {@code jdbc:} form with
     * credentials supplied separately, and without this check the mistake surfaces as
     * {@code 'url' must start with "jdbc"} from deep inside the connection pool.
     */
    private static void verifyJdbcUrl(String url) {
        if (url == null || url.startsWith("jdbc:")) {
            return;
        }

        throw new IllegalStateException(String.join(System.lineSeparator(),
                "",
                "DB_URL is not a JDBC URL.",
                "",
                "  found:    " + redactCredentials(url),
                "  expected: jdbc:postgresql://<host>/<database>?sslmode=require",
                "",
                "Providers such as Neon show a native connection string. Convert it: add the",
                "\"jdbc:\" prefix and move the user and password into DB_USERNAME / DB_PASSWORD.",
                ""));
    }

    /** Keeps a pasted {@code user:password@} out of the logs. */
    private static String redactCredentials(String url) {
        return url.replaceAll("//[^/@]*@", "//<credentials>@");
    }

    private static boolean isProduction(ConfigurableEnvironment environment) {
        for (String profile : environment.getActiveProfiles()) {
            if (PRODUCTION_PROFILE.equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }

    private static String buildMessage(List<String> missing) {
        StringBuilder message = new StringBuilder()
                .append(System.lineSeparator())
                .append("Travel Globe cannot start with the \"prod\" profile.")
                .append(System.lineSeparator())
                .append(System.lineSeparator())
                .append("Missing required environment variables:")
                .append(System.lineSeparator());

        for (String name : missing) {
            message.append("  - ").append(name).append("  (").append(REQUIRED.get(name)).append(')')
                    .append(System.lineSeparator());
        }

        return message
                .append(System.lineSeparator())
                .append("Set them in your hosting provider's dashboard. See docs/deployment.md.")
                .append(System.lineSeparator())
                .toString();
    }

    @Override
    public int getOrder() {
        // After ConfigDataEnvironmentPostProcessor, so active profiles are resolved.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
