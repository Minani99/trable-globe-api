package com.travelglobe.trableglobeapi.travel.repository;

import com.travelglobe.trableglobeapi.travel.domain.TravelPhoto;
import com.travelglobe.trableglobeapi.travel.repository.projection.TravelPhotoCountProjection;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

/**
 * Photos are queried separately from their trip.
 *
 * <p>Fetching two collections (places and photos) in one query would make Hibernate
 * produce a cartesian product, so the detail page pays one extra query instead.
 */
public interface TravelPhotoRepository extends JpaRepository<TravelPhoto, Long> {

    @Query("""
            select ph
            from TravelPhoto ph
              left join fetch ph.travelPlace
            where ph.travel.id = :travelId
            order by ph.sortOrder asc, ph.id asc
            """)
    List<TravelPhoto> findAllForTravel(@Param("travelId") Long travelId);

    @Query("""
            select new com.travelglobe.trableglobeapi.travel.repository.projection.TravelPhotoCountProjection(
                ph.travel.id, count(ph.id))
            from TravelPhoto ph
            where ph.travel.id in :travelIds
            group by ph.travel.id
            """)
    List<TravelPhotoCountProjection> countByTravelIds(@Param("travelIds") Collection<Long> travelIds);

    @Modifying
    @Query("delete from TravelPhoto ph where ph.travel.id = :travelId")
    void deleteAllForTravel(@Param("travelId") Long travelId);
}
