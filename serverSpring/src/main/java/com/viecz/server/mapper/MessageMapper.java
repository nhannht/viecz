package com.viecz.server.mapper;

import com.viecz.server.dto.chat.MessageResponse;
import com.viecz.server.model.Message;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.List;

/**
 * MapStruct mapper for Message entity
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MessageMapper {

    @Mapping(target = "senderName", source = "sender.name")
    MessageResponse toResponse(Message message);

    List<MessageResponse> toResponseList(List<Message> messages);
}
