package org.campus.donation_platform.service;

import org.campus.donation_platform.model.Donation;
import org.campus.donation_platform.repository.DonationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class DonationService {

    @Autowired
    private DonationRepository donationRepository;

    public List<Donation> getDonationsByStatus(String status) {
        return donationRepository.findByStatus(status);
    }

    public void updateDonationStatus(Long donationId, String status) {
        Optional<Donation> donationOptional = donationRepository.findById(donationId);
        if (donationOptional.isPresent()) {
            Donation donation = donationOptional.get();
            if (Arrays.asList("APPROVED", "REJECTED").contains(status.toUpperCase())) {
                donation.setStatus(status.toUpperCase());
                donationRepository.save(donation);
            } else {
                throw new IllegalArgumentException("Invalid status provided.");
            }
        } else {
            throw new RuntimeException("Donation not found with id: " + donationId);
        }
    }

    public List<Donation> getProcessedDonations() {
        return donationRepository.findByStatusIn(Arrays.asList("APPROVED", "REJECTED"));
    }
}