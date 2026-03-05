package org.campus.donation_platform.dto;

import lombok.Data;

@Data
public class CampaignRequest {
    private String title;
    private String description;
    private Double goalAmount;
}
