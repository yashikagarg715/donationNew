package org.campus.donation_platform.controller;

import org.campus.donation_platform.model.Campaign;
import org.campus.donation_platform.model.User;
import org.campus.donation_platform.repository.CampaignRepository;
import org.campus.donation_platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/campaigns")
@CrossOrigin(origins = "http://localhost:8080")
public class CampaignController {

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private UserRepository userRepository;

    // POST /campaigns/create - FINAL FIX: Header "User -Email" (hyphen only, NO SPACES)
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createCampaign(
            @RequestBody Map<String, Object> requestBody,
            @RequestHeader(value = "User-Email", required = false) String ngoEmail) {  // FIXED: "User -Email" (no spaces!)
        Map<String, Object> response = new HashMap<>();

        // TEMP DEBUG LOGGING: Will show header value—remove after success
        System.out.println("[DEBUG] /campaigns/create - Received request");
        System.out.println("[DEBUG] ngoEmail from header: '" + ngoEmail + "' (expected: your NGO email, e.g., ngo@example.com)");
        System.out.println("[DEBUG] Request body: " + requestBody);

        try {
            // Extract from body (trim for safety)
            String title = (String) requestBody.get("title");
            String description = (String) requestBody.get("description");
            Double goalValue;
            try {
                goalValue = Double.parseDouble(requestBody.get("goal").toString());
                System.out.println("[DEBUG] Goal parsed: " + goalValue);
            } catch (NumberFormatException e) {
                System.out.println("[DEBUG] Goal parsing failed: " + requestBody.get("goal"));
                response.put("error", "Invalid goal value: Must be a number.");
                return ResponseEntity.badRequest().body(response);
            }

            // Enhanced validation with trims
            if (ngoEmail == null || ngoEmail.trim().isEmpty()) {
                System.out.println("[DEBUG] VALIDATION FAIL: ngoEmail is null/empty (header mismatch or missing login)");
                response.put("error", "NGO email is required in the 'User -Email' header. Please log in again.");
                return ResponseEntity.badRequest().body(response);
            }
            if (title == null || title.trim().isEmpty()) {
                response.put("error", "Campaign title is required.");
                return ResponseEntity.badRequest().body(response);
            }
            if (description == null || description.trim().isEmpty()) {
                response.put("error", "Campaign description is required.");
                return ResponseEntity.badRequest().body(response);
            }
            if (goalValue <= 0) {
                response.put("error", "Goal must be a positive number.");
                return ResponseEntity.badRequest().body(response);
            }

            // Find NGO user (trim email for safety)
            String trimmedEmail = ngoEmail.trim();
            System.out.println("[DEBUG] Looking up user by email: '" + trimmedEmail + "'");
            User ngoUser  = userRepository.findByEmail(trimmedEmail);
            if (ngoUser  == null) {
                System.out.println("[DEBUG] USER NOT FOUND: No user in DB for '" + trimmedEmail + "'. Run: SELECT * FROM users WHERE email = '" + trimmedEmail + "';");
                response.put("error", "NGO not found with email: " + trimmedEmail + ". Please register/login as NGO.");
                return ResponseEntity.badRequest().body(response);
            }
            // Optional: Role check (uncomment if needed)
            // if (!"NGO".equals(ngoUser .getRole())) {
            //     response.put("error", "Only NGOs can create campaigns. Your role: " + ngoUser .getRole());
            //     return ResponseEntity.badRequest().body(response);
            // }
            Long ngoId = ngoUser .getId();
            System.out.println("[DEBUG] Found NGO user ID: " + ngoId + ", Role: " + ngoUser .getRole());

            // Create and save Campaign
            Campaign campaign = new Campaign();
            campaign.setNgoId(ngoId);
            campaign.setNgoEmail(trimmedEmail);
            campaign.setTitle(title.trim());
            campaign.setDescription(description.trim());
            campaign.setGoal(java.math.BigDecimal.valueOf(goalValue));
            campaign.setCurrentAmount(java.math.BigDecimal.ZERO);
            campaign.setStatus("ACTIVE");

            System.out.println("[DEBUG] Saving campaign: Title='" + title.trim() + "', Goal=" + goalValue);
            Campaign savedCampaign = campaignRepository.save(campaign);
            System.out.println("[DEBUG] SUCCESS: Campaign saved with ID: " + savedCampaign.getId());

            response.put("message", "Campaign created successfully!");
            response.put("campaignId", savedCampaign.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("[ERROR] Unexpected error in createCampaign: " + e.getMessage());
            e.printStackTrace();  // Full stack trace in console
            response.put("error", "Failed to create campaign: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // GET /campaigns/my-campaigns?ngoEmail=... (minor logging update)
    @GetMapping("/my-campaigns")
    public ResponseEntity<?> getMyCampaigns(@RequestParam String ngoEmail) {
        try {
            System.out.println("[DEBUG] /campaigns/my-campaigns - ngoEmail param: '" + ngoEmail + "'");
            if (ngoEmail == null || ngoEmail.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "ngoEmail parameter required.");
                return ResponseEntity.badRequest().body(error);
            }

            List<Campaign> campaigns = campaignRepository.findByNgoEmail(ngoEmail.trim());
            System.out.println("[DEBUG] Found " + campaigns.size() + " campaigns for '" + ngoEmail.trim() + "'");
            return ResponseEntity.ok(campaigns);
        } catch (Exception e) {
            System.err.println("[ERROR] Error in getMyCampaigns: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load campaigns: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }


    // GET /campaigns/active -Fetch all active campaigns for donors (public view)
    @GetMapping("/active")
    public ResponseEntity<?> getActiveCampaigns() {
        try {
            System.out.println("[DEBUG] /campaigns/active - Fetching active campaigns for donors");  // TEMP: Remove after testing
            List<Campaign> activeCampaigns = campaignRepository.findByStatus("ACTIVE");
            System.out.println("[DEBUG] Found " + activeCampaigns.size() + " active campaigns");  // TEMP
            return ResponseEntity.ok(activeCampaigns);
        } catch (Exception e) {
            System.err.println("[ERROR] Error fetching active campaigns: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load active campaigns: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // POST /campaigns/{id}/donate -  Handle monetary donation to a campaign
    @PostMapping("/{id}/donate")
    public ResponseEntity<Map<String, Object>> donateToCampaign(
            @PathVariable Long id,
            @RequestBody Map<String, Object> requestBody,
            @RequestHeader(value = "User  -Email", required = false) String donorEmail) {  // Auth: Donor email
        Map<String, Object> response = new HashMap<>();
        try {
            // Extract donation amount
            Double donationAmount;
            try {
                donationAmount = Double.parseDouble(requestBody.get("amount").toString());
            } catch (NumberFormatException e) {
                response.put("error", "Invalid donation amount: Must be a positive number.");
                return ResponseEntity.badRequest().body(response);
            }

            if (donorEmail == null || donorEmail.trim().isEmpty()) {
                response.put("error", "Donor email is required in the 'User  -Email' header. Please log in.");
                return ResponseEntity.badRequest().body(response);
            }
            if (donationAmount == null || donationAmount <= 0) {
                response.put("error", "Donation amount must be positive.");
                return ResponseEntity.badRequest().body(response);
            }

            // Find campaign
            Optional<Campaign> optionalCampaign = campaignRepository.findById(id);
            if (optionalCampaign.isEmpty()) {
                response.put("error", "Campaign not found with ID: " + id);
                return ResponseEntity.badRequest().body(response);
            }
            Campaign campaign = optionalCampaign.get();

            // Check if active
            if (!"active".equals(campaign.getStatus())) {
                response.put("error", "This campaign is no longer active for donations.");
                return ResponseEntity.badRequest().body(response);
            }

            // Update current amount
            BigDecimal current = campaign.getCurrentAmount().add(BigDecimal.valueOf(donationAmount));
            campaign.setCurrentAmount(current);

            // Optional: Check if goal met
            if (current.compareTo(campaign.getGoal()) >= 0) {
                campaign.setStatus("completed");
                response.put("message", "Donation successful! Campaign goal has been met.");
            } else {
                response.put("message", "Donation successful! Thank you for contributing.");
            }

            // Save
            Campaign savedCampaign = campaignRepository.save(campaign);
            System.out.println("[DEBUG] Donation of " + donationAmount + " added to campaign ID " + id + " by " + donorEmail);  // TEMP

            response.put("campaignId", savedCampaign.getId());
            response.put("newCurrentAmount", savedCampaign.getCurrentAmount().toString());
            response.put("status", savedCampaign.getStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to process donation: " + e.getMessage());
            e.printStackTrace();
            response.put("error", "Failed to process donation: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }



}
