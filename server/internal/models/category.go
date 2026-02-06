package models

import (
	"fmt"

	"gorm.io/gorm"
)

// Category represents a task category
type Category struct {
	ID       int     `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string  `gorm:"size:50;not null" json:"name"`
	NameVi   string  `gorm:"size:50;not null" json:"name_vi"`
	Icon     *string `gorm:"size:50" json:"icon,omitempty"`
	IsActive bool    `gorm:"default:true" json:"is_active"`
}

// Validate validates the category model
func (c *Category) Validate() error {
	if c.Name == "" {
		return fmt.Errorf("name is required")
	}

	if len(c.Name) > 50 {
		return fmt.Errorf("name must be less than 50 characters")
	}

	if c.NameVi == "" {
		return fmt.Errorf("name_vi is required")
	}

	if len(c.NameVi) > 50 {
		return fmt.Errorf("name_vi must be less than 50 characters")
	}

	return nil
}

// BeforeCreate hook is called before creating a category
func (c *Category) BeforeCreate(tx *gorm.DB) error {
	return c.Validate()
}

// BeforeUpdate hook is called before updating a category
func (c *Category) BeforeUpdate(tx *gorm.DB) error {
	return c.Validate()
}
