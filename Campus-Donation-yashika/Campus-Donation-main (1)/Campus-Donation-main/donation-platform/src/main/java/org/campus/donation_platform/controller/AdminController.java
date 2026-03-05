package org.campus.donation_platform.controller;

import org.campus.donation_platform.model.Donation;
import org.campus.donation_platform.service.DonationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private DonationService donationService;

    // Fetches all pending donation requests
    @GetMapping("/pending-donations")
    public ResponseEntity<List<Donation>> getPendingDonations() {
        List<Donation> pendingDonations = donationService.getDonationsByStatus("PENDING");
        return ResponseEntity.ok(pendingDonations);
    }

    // Approves or rejects a donation request
    @PatchMapping("/donations/{donationId}/status")
    public ResponseEntity<String> updateDonationStatus(@PathVariable Long donationId, @RequestParam String status) {
        try {
            donationService.updateDonationStatus(donationId, status);
            return ResponseEntity.ok("Donation status updated to " + status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to update status: " + e.getMessage());
        }
    }

    // Fetches a history of all processed donations
    @GetMapping("/donation-history")
    public ResponseEntity<List<Donation>> getDonationHistory() {
        List<Donation> history = donationService.getProcessedDonations();
        return ResponseEntity.ok(history);
    }
}