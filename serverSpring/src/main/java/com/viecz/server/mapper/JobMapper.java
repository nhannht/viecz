package com.viecz.server.mapper;

import com.viecz.server.dto.job.JobRequest;
import com.viecz.server.dto.job.JobResponse;
import com.viecz.server.model.Job;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for Job entity
 */
@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        uses = {CategoryMapper.class}
)
public interface JobMapper {

    @Mapping(target = "category", source = "category")
    @Mapping(target = "requesterId", source = "requester.id")
    @Mapping(target = "requesterName", source = "requester.name")
    @Mapping(target = "taskerId", source = "tasker.id")
    @Mapping(target = "taskerName", source = "tasker.name")
    @Mapping(target = "deadline", source = "scheduledFor")
    @Mapping(target = "images", source = "imageUrls")
    JobResponse toResponse(Job job);

    List<JobResponse> toResponseList(List<Job> jobs);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "requesterId", ignore = true)
    @Mapping(target = "requester", ignore = true)
    @Mapping(target = "taskerId", ignore = true)
    @Mapping(target = "tasker", ignore = true)
    @Mapping(target = "categoryId", source = "categoryId")
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "scheduledFor", source = "deadline")
    @Mapping(target = "imageUrls", source = "images")
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "latitude", ignore = true)
    @Mapping(target = "longitude", ignore = true)
    @Mapping(target = "requesterRatingId", ignore = true)
    @Mapping(target = "taskerRatingId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Job toEntity(JobRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "requesterId", ignore = true)
    @Mapping(target = "requester", ignore = true)
    @Mapping(target = "taskerId", ignore = true)
    @Mapping(target = "tasker", ignore = true)
    @Mapping(target = "categoryId", source = "categoryId")
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "scheduledFor", source = "deadline")
    @Mapping(target = "imageUrls", source = "images")
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "latitude", ignore = true)
    @Mapping(target = "longitude", ignore = true)
    @Mapping(target = "requesterRatingId", ignore = true)
    @Mapping(target = "taskerRatingId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(JobRequest request, @MappingTarget Job job);
}
