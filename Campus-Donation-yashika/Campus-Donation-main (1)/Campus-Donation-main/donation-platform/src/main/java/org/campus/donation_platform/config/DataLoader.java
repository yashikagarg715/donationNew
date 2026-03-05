package org.campus.donation_platform.config;

import org.campus.donation_platform.model.Donation;
import org.campus.donation_platform.model.User;
import org.campus.donation_platform.repository.DonationRepository;
import org.campus.donation_platform.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DonationRepository donationRepository;

    public DataLoader(UserRepository userRepository, DonationRepository donationRepository) {
        this.userRepository = userRepository;
        this.donationRepository = donationRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1️ Add Admin Users
        if (userRepository.findByEmail("admin1@campus.com") == null) {
            userRepository.save(new User(null, "Main Admin", "admin1@campus.com", "12345", "ADMIN"));
        }
        if (userRepository.findByEmail("admin2@campus.com") == null) {
            userRepository.save(new User(null, "Backup Admin", "admin2@campus.com", "12345", "ADMIN"));
        }

        // 2️ Add Donor User
        User donor = userRepository.findByEmail("donor@campus.com");
        if (donor == null) {
            donor = userRepository.save(new User(null, "Muskan Donor", "donor@campus.com", "12345", "DONOR"));
        }

        // 3️ Add Initial Donation (if none exist)
        if (donationRepository.findAll().isEmpty()) {
            Donation donation = new Donation();
            donation.setItemName("Notebooks");
            donation.setQuantity(5);
            donation.setDescription("Barely used notebooks for students");
            donation.setStatus("AVAILABLE");
            donation.setDonor(donor);
            donationRepository.save(donation);
        }
    }
}
