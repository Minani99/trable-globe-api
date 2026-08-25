package com.travelglobe.trableglobeapi.travel.service;

import com.travelglobe.trableglobeapi.auth.security.MemberPrincipal;
import com.travelglobe.trableglobeapi.global.exception.InvalidRequestException;
import com.travelglobe.trableglobeapi.global.exception.ResourceNotFoundException;
import com.travelglobe.trableglobeapi.travel.domain.Travel;
import com.travelglobe.trableglobeapi.travel.domain.TravelTask;
import com.travelglobe.trableglobeapi.travel.dto.TravelTaskResponse;
import com.travelglobe.trableglobeapi.travel.dto.write.CreateTravelTaskRequest;
import com.travelglobe.trableglobeapi.travel.dto.write.UpdateTravelTaskRequest;
import com.travelglobe.trableglobeapi.travel.repository.TravelRepository;
import com.travelglobe.trableglobeapi.travel.repository.TravelTaskRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TravelTaskService {

    private static final int MAX_TASKS = 30;

    private final TravelRepository travelRepository;
    private final TravelTaskRepository taskRepository;

    public TravelTaskService(TravelRepository travelRepository, TravelTaskRepository taskRepository) {
        this.travelRepository = travelRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional(readOnly = true)
    public List<TravelTaskResponse> findMine(MemberPrincipal principal, Long travelId) {
        requireOwnedTravel(principal, travelId);
        return responses(taskRepository.findOwnedTasks(travelId, principal.memberId()));
    }

    @Transactional
    public List<TravelTaskResponse> create(
            MemberPrincipal principal, Long travelId, CreateTravelTaskRequest request) {
        Travel travel = requireOwnedTravel(principal, travelId);
        long count = taskRepository.countByTravelId(travelId);
        if (count >= MAX_TASKS) {
            throw new InvalidRequestException("여행 준비 항목은 최대 30개까지 만들 수 있습니다.");
        }
        taskRepository.saveAndFlush(TravelTask.create(
                travel, request.title().trim(), request.category(), Math.toIntExact(count)));
        return responses(taskRepository.findOwnedTasks(travelId, principal.memberId()));
    }

    @Transactional
    public List<TravelTaskResponse> update(
            MemberPrincipal principal,
            Long travelId,
            Long taskId,
            UpdateTravelTaskRequest request) {
        TravelTask task = ownedTask(principal, travelId, taskId);
        task.setCompleted(request.completed());
        taskRepository.flush();
        return responses(taskRepository.findOwnedTasks(travelId, principal.memberId()));
    }

    @Transactional
    public List<TravelTaskResponse> delete(MemberPrincipal principal, Long travelId, Long taskId) {
        TravelTask task = ownedTask(principal, travelId, taskId);
        taskRepository.delete(task);
        taskRepository.flush();
        return responses(taskRepository.findOwnedTasks(travelId, principal.memberId()));
    }

    private Travel requireOwnedTravel(MemberPrincipal principal, Long travelId) {
        return travelRepository.findOwnedDetail(travelId, principal.memberId())
                .orElseThrow(() -> ResourceNotFoundException.travel(travelId));
    }

    private TravelTask ownedTask(MemberPrincipal principal, Long travelId, Long taskId) {
        return taskRepository.findByIdAndTravelIdAndTravelMemberId(
                        taskId, travelId, principal.memberId())
                .orElseThrow(() -> new ResourceNotFoundException("여행 준비 항목을 찾을 수 없습니다: " + taskId));
    }

    private static List<TravelTaskResponse> responses(List<TravelTask> tasks) {
        return tasks.stream().map(TravelTaskResponse::from).toList();
    }
}
