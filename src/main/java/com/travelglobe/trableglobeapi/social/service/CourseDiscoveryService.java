package com.travelglobe.trableglobeapi.social.service;

import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class CourseDiscoveryService {
    private final JdbcClient jdbc;

    public CourseDiscoveryService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record Course(long travelId, String title, String username, LocalDate date, long day,
                         int stops, String firstStop, String lastStop, String transport, String reflection) {}

    public List<Course> find(String destination, long viewerId) {
        String query = destination.strip();
        if (query.length() > 60) throw new InvalidRequestException("목적지는 60자 이내로 입력해 주세요.");
        // Select matching days first. Their stop count and endpoints cover the whole day,
        // including places whose names did not match the search.
        return jdbc.sql("""
                select d.*, cd.transport, cd.reflection,
                       (select p.place_name from travel_places p where p.travel_id=d.travel_id
                         and p.visited_at=d.visited_at order by p.sort_order, p.id limit 1) as first_stop,
                       (select p.place_name from travel_places p where p.travel_id=d.travel_id
                         and p.visited_at=d.visited_at order by p.sort_order desc, p.id desc limit 1) as last_stop
                  from (
                    select t.id as travel_id, t.title, m.username, t.start_date, p.visited_at, count(*) as stops
                      from travels t join members m on m.id=t.member_id
                      join travel_places p on p.travel_id=t.id
                      join countries co on co.id=p.country_id left join cities ci on ci.id=p.city_id
                     where t.visibility='PUBLIC' and p.visited_at is not null
                       and not exists (select 1 from member_blocks b
                           where (b.blocker_id=:viewer and b.blocked_id=m.id)
                              or (b.blocked_id=:viewer and b.blocker_id=m.id))
                     group by t.id, t.title, m.username, t.start_date, p.visited_at
                    having max(case when position(lower(:query) in lower(concat_ws(' ', p.place_name,
                               ci.name_ko, ci.name_en, co.name_ko, co.name_en))) > 0 then 1 else 0 end)=1
                        or :query=''
                     order by p.visited_at desc, t.id desc limit 8
                  ) d left join travel_course_days cd on cd.travel_id=d.travel_id and cd.course_date=d.visited_at
                 order by d.visited_at desc, d.travel_id desc
                """).param("query", query).param("viewer", viewerId)
                .query((rs, row) -> {
                    LocalDate date = rs.getDate("visited_at").toLocalDate();
                    return new Course(rs.getLong("travel_id"), rs.getString("title"), rs.getString("username"),
                            date, ChronoUnit.DAYS.between(rs.getDate("start_date").toLocalDate(), date) + 1,
                            rs.getInt("stops"), rs.getString("first_stop"), rs.getString("last_stop"),
                            rs.getString("transport"), rs.getString("reflection"));
                }).list();
    }
}
