package com.viecz.server.mapper;

import com.viecz.server.dto.chat.ConversationResponse;
import com.viecz.server.model.Conversation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.List;

/**
 * MapStruct mapper for Conversation entity
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ConversationMapper {

    @Mapping(target = "jobId", source = "task.id")
    @Mapping(target = "jobTitle", source = "task.title")
    @Mapping(target = "posterName", source = "poster.name")
    @Mapping(target = "taskerName", source = "tasker.name")
    @Mapping(target = "unreadCount", ignore = true) // Calculated separately
    ConversationResponse toResponse(Conversation conversation);

    List<ConversationResponse> toResponseList(List<Conversation> conversations);
}
