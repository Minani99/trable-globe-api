FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy

WORKDIR /app
ENV JAVA_TOOL_OPTIONS="-XX:InitialRAMPercentage=20.0 -XX:MaxRAMPercentage=60.0 -XX:+UseSerialGC"

COPY --from=build --chown=10001:0 /workspace/target/trable-globe-api-0.0.1-SNAPSHOT.jar ./app.jar

USER 10001
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
