package com.travelglobe.trableglobeapi.travel.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Embeddable
public record CourseDay(
        @Column(length = 20) @Pattern(regexp = "혼자|연인과|친구와|가족과|아이와|부모님과") String companion,
        @Column(length = 20) @Pattern(regexp = "도보|대중교통|자차|자전거|혼합") String transport,
        @Column(length = 240) @Size(max = 240) String reflection) {
}
