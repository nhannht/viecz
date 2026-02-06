package com.viecz.server.mapper;

import com.viecz.server.dto.transaction.TransactionResponse;
import com.viecz.server.model.Transaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.List;

/**
 * MapStruct mapper for Transaction entity
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface TransactionMapper {

    @Mapping(target = "jobId", source = "task.id")
    @Mapping(target = "jobTitle", source = "task.title")
    @Mapping(target = "payerName", source = "payer.name")
    @Mapping(target = "payeeName", source = "payee.name")
    TransactionResponse toResponse(Transaction transaction);

    List<TransactionResponse> toResponseList(List<Transaction> transactions);
}
