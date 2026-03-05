package org.campus.donation_platform.dto;

public class DonationRequest {
    private String email;
    private String itemName;
    private int quantity;
    private String description;

    // Getters & Setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
