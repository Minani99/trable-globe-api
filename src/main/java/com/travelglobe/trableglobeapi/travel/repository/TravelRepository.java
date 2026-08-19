package com.travelglobe.trableglobeapi.travel.repository;

import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.Visibility;
import com.travelglobe.trableglobeapi.travel.repository.projection.CountryVisitProjection;
import com.travelglobe.trableglobeapi.travel.repository.projection.TravelNavProjection;
import com.travelglobe.trableglobeapi.travel.repository.projection.TravelStatisticsProjection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Read access to trips.
 *
 * <p>Every public query takes an explicit {@link Visibility} instead of defaulting to
 * "everything": once authentication exists, the caller decides what it may see, and a
 * forgotten filter shows up as a compile error rather than a data leak.
 *
 * <p>Itineraries are fetch-joined so a profile page costs a fixed number of queries. The
 * collections are not paginated - a member's trip count is small by nature, and paging a
 * fetch join would force Hibernate to sort in memory.
 */
public interface TravelRepository extends JpaRepository<Travel, Long> {

    Optional<Travel> findByIdAndVisibility(Long id, Visibility visibility);

    @Query("""
            select t
            from Travel t
              left join fetch t.places p
              left join fetch p.country
              left join fetch p.city
            where t.member.id = :memberId
            order by t.startDate desc, t.id desc
            """)
    List<Travel> findOwnedTravels(@Param("memberId") Long memberId);

    @Query("""
            select t
            from Travel t
              join fetch t.member
              left join fetch t.places p
              left join fetch p.country
              left join fetch p.city
            where t.id = :travelId and t.member.id = :memberId
            """)
    Optional<Travel> findOwnedDetail(@Param("travelId") Long travelId,
                                     @Param("memberId") Long memberId);

    @Query("""
            select t
            from Travel t
              left join fetch t.places p
              left join fetch p.country
              left join fetch p.city
            where t.member.username = :username
              and t.visibility = :visibility
            order by t.startDate desc, t.id desc
            """)
    List<Travel> findProfileTravels(@Param("username") String username,
                                    @Param("visibility") Visibility visibility);

    @Query("""
            select t
            from Travel t
              left join fetch t.places p
              left join fetch p.country
              left join fetch p.city
            where t.member.username = :username
              and t.visibility = :visibility
              and exists (
                  select 1 from TravelPlace tp
                  where tp.travel = t and tp.country.iso2Code = :iso2Code)
            order by t.startDate desc, t.id desc
            """)
    List<Travel> findProfileTravelsByCountry(@Param("username") String username,
                                             @Param("iso2Code") String iso2Code,
                                             @Param("visibility") Visibility visibility);

    @Query("""
            select t
            from Travel t
              join fetch t.member
              left join fetch t.places p
              left join fetch p.country
              left join fetch p.city
            where t.id = :travelId
              and t.visibility = :visibility
            """)
    Optional<Travel> findDetail(@Param("travelId") Long travelId,
                                @Param("visibility") Visibility visibility);

    @Query("""
            select new com.travelglobe.trableglobeapi.travel.repository.projection.TravelNavProjection(
                t.id, t.title, t.startDate)
            from Travel t
            where t.member.username = :username
              and t.visibility = :visibility
            order by t.startDate desc, t.id desc
            """)
    List<TravelNavProjection> findNavigationList(@Param("username") String username,
                                                 @Param("visibility") Visibility visibility);

    /**
     * Visited countries with per-country trip and city counts.
     *
     * <p>{@code city} is left-joined because a stop may have no city yet;
     * {@code count(distinct ci.id)} ignores those nulls.
     */
    @Query("""
            select new com.travelglobe.trableglobeapi.travel.repository.projection.CountryVisitProjection(
                c.iso2Code, c.iso3Code, c.nameEn, c.nameKo, c.latitude, c.longitude,
                count(distinct t.id), count(distinct ci.id), max(coalesce(p.visitedAt, t.endDate)))
            from TravelPlace p
              join p.travel t
              join p.country c
              left join p.city ci
            where t.member.username = :username
              and t.visibility = :visibility
            group by c.id, c.iso2Code, c.iso3Code, c.nameEn, c.nameKo, c.latitude, c.longitude
            order by count(distinct t.id) desc, c.nameEn asc
            """)
    List<CountryVisitProjection> findVisitedCountries(@Param("username") String username,
                                                      @Param("visibility") Visibility visibility);

    /**
     * Profile totals. Returns a single row even when the member has no trips, in which
     * case every aggregate is {@code null}.
     */
    @Query("""
            select new com.travelglobe.trableglobeapi.travel.repository.projection.TravelStatisticsProjection(
                count(distinct c.id), count(distinct ci.id), count(distinct t.id), count(p.id),
                min(t.startDate), max(t.endDate))
            from Travel t
              left join t.places p
              left join p.country c
              left join p.city ci
            where t.member.username = :username
              and t.visibility = :visibility
            """)
    TravelStatisticsProjection findStatistics(@Param("username") String username,
                                              @Param("visibility") Visibility visibility);
}
