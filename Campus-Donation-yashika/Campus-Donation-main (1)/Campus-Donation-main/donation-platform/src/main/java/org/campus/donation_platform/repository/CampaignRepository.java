package org.campus.donation_platform.repository;

import org.campus.donation_platform.model.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    List<Campaign> findByNgoEmail(String ngoEmail);

    List<Campaign> findByStatus(String status);

}
