package org.campus.donation_platform.controller;

import org.campus.donation_platform.model.Donation;
import org.campus.donation_platform.model.User;
import org.campus.donation_platform.repository.DonationRepository;
import org.campus.donation_platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/donations")
public class DonationController {

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private UserRepository userRepository;


    @GetMapping("/my-donations")
    public ResponseEntity<List<Donation>> getMyDonations(@RequestParam String email) {
        // Find the User object associated with the email
        User donor = userRepository.findByEmail(email);

        if (donor == null) {
            return ResponseEntity.notFound().build();
        }

        // Fetch all donations and filter by the donor's email (or use a dedicated JpaRepository method for better performance)
        List<Donation> myDonations = donationRepository.findAll().stream()
                .filter(d -> d.getDonor().getEmail().equals(email)) // Assuming Donation model links to donor and has an email field
                .collect(Collectors.toList());

        return ResponseEntity.ok(myDonations);
    }

    /**
     * Endpoint to add a new donation (used by Donor Dashboard).
     * Maps to: POST /donations/add
     * The donor's identity is passed via the User-Email header, simplifying the request body.
     */
    @PostMapping("/add")
    public ResponseEntity<?> addDonation(@RequestBody Donation donationRequest, @RequestHeader("User-Email") String email) {
        // Use the email from the header to find the logged-in user (Donor)
        User donor = userRepository.findByEmail(email);

        if (donor == null || !"DONOR".equals(donor.getRole())) {
            // Updated error message for clarity when using headers
            return ResponseEntity.badRequest().body("Authentication failed or user is not registered as a DONOR.");
        }

        // 1. Set the donor object and initial status
        donationRequest.setDonor(donor);
        donationRequest.setStatus("LISTED"); // Initial status when a donor lists an item

        // 2. Save the donation
        donationRepository.save(donationRequest);

        return ResponseEntity.ok(Map.of("message", "Donation listed successfully!", "donationId", donationRequest.getId()));
    }


    // --- NGO METHODS ---

    // Example: GET /donations/available (public, for NGOs to view)
    @GetMapping("/available")
    public ResponseEntity<List<Donation>> getAvailableDonations() {
        // Filter for LISTED status
        List<Donation> available = donationRepository.findAll().stream()
                .filter(d -> "LISTED".equals(d.getStatus()))
                .toList();
        return ResponseEntity.ok(available);
    }

    // NGO Request Donation (PATCH /donations/request/{id})
    @PatchMapping("/request/{id}")
    public ResponseEntity<?> requestDonation(@PathVariable Long id, @RequestHeader("User-Email") String email) {
        User ngo = userRepository.findByEmail(email);

        if (ngo == null || !"NGO".equals(ngo.getRole())) {
            return ResponseEntity.badRequest().body("Only NGOs can request donations.");
        }

        Donation donation = donationRepository.findById(id).orElse(null);
        // Status should be LISTED before an NGO can request it
        if (donation == null || !"LISTED".equals(donation.getStatus())) {
            return ResponseEntity.badRequest().body("Donation not available or already requested.");
        }

        // Update status and link to NGO
        donation.setStatus("PENDING"); // Change status to PENDING (waiting for Admin approval)
        donation.setNgo(ngo); // Assumes your Donation model has @ManyToOne User ngo;
        donationRepository.save(donation);
        return ResponseEntity.ok(Map.of("message", "Donation requested successfully! Pending Admin approval."));
    }
}
