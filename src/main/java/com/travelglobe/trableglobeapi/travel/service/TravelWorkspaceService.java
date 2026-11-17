package com.travelglobe.trableglobeapi.travel.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.travel.dto.TravelWorkspaceResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads a trip together with its checklist and budget in a single transaction.
 *
 * The editor always needs all three. Fetching them through one endpoint means one
 * authentication, one database connection and one network round trip from the web host
 * instead of three that compete for the same small connection pool.
 */
@Service
public class TravelWorkspaceService {

    private final TravelCommandService travelCommandService;
    private final TravelTaskService travelTaskService;
    private final TravelPlanningService travelPlanningService;

    public TravelWorkspaceService(TravelCommandService travelCommandService,
                                  TravelTaskService travelTaskService,
                                  TravelPlanningService travelPlanningService) {
        this.travelCommandService = travelCommandService;
        this.travelTaskService = travelTaskService;
        this.travelPlanningService = travelPlanningService;
    }

    @Transactional(readOnly = true)
    public TravelWorkspaceResponse findMine(MemberPrincipal principal, Long travelId) {
        // Ownership is checked by the first call; a trip that is not the caller's is a 404
        // before anything else is read.
        return new TravelWorkspaceResponse(
                travelCommandService.getMine(principal, travelId),
                travelTaskService.findMine(principal, travelId),
                travelPlanningService.findMine(principal, travelId));
    }
}
