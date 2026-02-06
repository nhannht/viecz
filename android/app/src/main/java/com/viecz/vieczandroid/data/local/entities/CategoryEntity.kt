package com.viecz.vieczandroid.data.local.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.viecz.vieczandroid.data.models.Category

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: Int,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "name_vi")
    val nameVi: String,

    @ColumnInfo(name = "icon")
    val icon: String?,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean
)

// Extension functions to convert between Category and CategoryEntity
fun Category.toEntity() = CategoryEntity(
    id = id,
    name = name,
    nameVi = nameVi,
    icon = icon,
    isActive = isActive
)

fun CategoryEntity.toCategory() = Category(
    id = id,
    name = name,
    nameVi = nameVi,
    icon = icon,
    isActive = isActive
)
