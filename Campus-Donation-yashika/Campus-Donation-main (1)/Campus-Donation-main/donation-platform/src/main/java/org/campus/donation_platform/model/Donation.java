package org.campus.donation_platform.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "donations")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String itemName;
    private int quantity;
    private String description;

    // Status: "LISTED" (Default), "PENDING", "APPROVED", "REJECTED"
    // Note: Changed "AVAILABLE" to "LISTED" for clarity with the controller logic.
    private String status = "LISTED";

    // Donor link (MUST reference the 'id' column of the User table)
    @ManyToOne
    @JoinColumn(name = "donor_id", referencedColumnName = "id")
    private User donor;

    // NGO link (MUST reference the 'id' column of the User table)
    // FIX: Explicitly setting referencedColumnName = "id" to resolve the foreign key error.
    @ManyToOne
    @JoinColumn(name = "ngo_id", referencedColumnName = "id")
    private User ngo;


}
