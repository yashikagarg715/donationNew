package org.campus.donation_platform.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "campaigns")
public class Campaign {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngo_id", nullable = false)  // Maps to required ngo_id column (FK to users.id)
    private Long ngoId;  // Foreign key to User.id

    @Column(name = "ngo_email")
    private String ngoEmail;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private BigDecimal goal = BigDecimal.ZERO;

    @Column(name = "current_amount")
    private BigDecimal currentAmount = BigDecimal.ZERO;

    @Column
    private String status = "ACTIVE";

    // Default constructor
    public Campaign() {}

    // Getters and Setters (Add these for new fields; )
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getNgoId() { return ngoId; }  // NEW
    public void setNgoId(Long ngoId) { this.ngoId = ngoId; }  // NEW

    public String getNgoEmail() { return ngoEmail; }
    public void setNgoEmail(String ngoEmail) { this.ngoEmail = ngoEmail; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getGoal() { return goal; }
    public void setGoal(BigDecimal goal) { this.goal = goal; }

    public BigDecimal getCurrentAmount() { return currentAmount; }
    public void setCurrentAmount(BigDecimal currentAmount) { this.currentAmount = currentAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
