CREATE TABLE travel_course_days (
    travel_id BIGINT NOT NULL REFERENCES travels(id) ON DELETE CASCADE,
    course_date DATE NOT NULL,
    companion VARCHAR(20),
    transport VARCHAR(20),
    reflection VARCHAR(240),
    PRIMARY KEY (travel_id, course_date)
);
