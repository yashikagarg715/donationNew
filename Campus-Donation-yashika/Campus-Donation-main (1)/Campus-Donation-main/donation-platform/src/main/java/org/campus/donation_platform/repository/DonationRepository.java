package org.campus.donation_platform.repository;

import org.campus.donation_platform.model.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonationRepository extends JpaRepository<Donation, Long> {
    List<Donation> findByStatus(String status);
    List<Donation> findByStatusIn(List<String> statuses);
}