package org.campus.donation_platform.repository;

import org.campus.donation_platform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    User findByEmail(String email);  // ✅ login ke liye email based search
}
