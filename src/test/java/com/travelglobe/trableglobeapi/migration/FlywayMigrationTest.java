package com.travelglobe.trableglobeapi.migration;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Reproduces the production start-up chain: Flyway builds the schema, then Hibernate
 * validates the entity model against it.
 *
 * <p>Written after a deployment failed with {@code missing table [cities]}. The cause was
 * that {@code flyway-core} was on the classpath but Spring Boot 4's separate
 * {@code spring-boot-flyway} auto-configuration module was not, so nothing ever ran the
 * migrations. The {@code local} profile hides this because Hibernate generates the schema
 * there, which is precisely why this test pins the wiring rather than the SQL alone.
 *
 * <p>Uses H2 in PostgreSQL compatibility mode: close enough to catch a migration that does
 * not run, does not parse, or drifts from the entities.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:flywaycheck;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        // Exactly what "postgres" and "prod" do: Flyway owns the schema, Hibernate only checks it.
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "travel-globe.seed.enabled=false"
})
class FlywayMigrationTest {

    /** Every table the entity model maps. */
    private static final List<String> EXPECTED_TABLES =
            List.of("members", "member_credentials", "auth_sessions", "countries", "cities",
                    "travels", "travel_places", "travel_photos");

    @Autowired
    private DataSource dataSource;

    /**
     * Present only when the auto-configuration module is on the classpath. Injecting it is
     * the assertion: without spring-boot-flyway the context fails to start.
     */
    @Autowired
    private Flyway flyway;

    @Test
    @DisplayName("Spring 이 기동 시 Flyway 마이그레이션을 실행한다")
    void springRunsTheMigrationOnStartup() {
        assertThat(flyway)
                .as("no Flyway bean - is spring-boot-flyway on the classpath?")
                .isNotNull();
        assertThat(flyway.info().applied())
                .as("Flyway was wired but applied nothing")
                .isNotEmpty();
    }

    @Test
    @DisplayName("마이그레이션이 엔티티가 요구하는 테이블을 모두 만든다")
    void migrationCreatesEveryTable() throws Exception {
        assertThat(readTableNames()).containsAll(EXPECTED_TABLES);
    }

    /**
     * The context itself is the assertion: {@code ddl-auto=validate} means Hibernate
     * refuses to start when an entity does not match the migrated schema, so an entity
     * change without a matching migration fails here instead of on the next deploy.
     */
    @Test
    @DisplayName("엔티티 모델과 마이그레이션 스키마가 일치한다")
    void entityModelMatchesMigratedSchema() {
        assertThat(dataSource).isNotNull();
    }

    private List<String> readTableNames() throws Exception {
        List<String> tables = new ArrayList<>();
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            try (ResultSet rs = metaData.getTables(null, null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tables.add(rs.getString("TABLE_NAME").toLowerCase());
                }
            }
        }
        return tables;
    }
}
