package com.viecz.server.mapper;

import com.viecz.server.dto.application.JobApplicationResponse;
import com.viecz.server.model.JobApplication;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.List;

/**
 * MapStruct mapper for JobApplication entity
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface JobApplicationMapper {

    @Mapping(target = "jobId", source = "task.id")
    @Mapping(target = "jobTitle", source = "task.title")
    @Mapping(target = "taskerId", source = "tasker.id")
    @Mapping(target = "taskerName", source = "tasker.name")
    @Mapping(target = "taskerRating", source = "tasker.rating")
    JobApplicationResponse toResponse(JobApplication application);

    List<JobApplicationResponse> toResponseList(List<JobApplication> applications);
}
