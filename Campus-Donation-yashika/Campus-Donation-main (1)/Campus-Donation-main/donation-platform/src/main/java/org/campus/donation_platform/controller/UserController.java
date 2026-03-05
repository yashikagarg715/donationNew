package org.campus.donation_platform.controller;

import org.campus.donation_platform.model.User;
import org.campus.donation_platform.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    //  Add new user (Register)
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        // Input validation
        if (user.getUsername() == null || user.getUsername().trim().isEmpty() ||
                user.getEmail() == null || user.getEmail().trim().isEmpty() ||
                user.getPassword() == null || user.getPassword().trim().isEmpty() ||
                user.getRole() == null || user.getRole().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("All fields (username, email, password, role) are required and cannot be empty.");
        }

        // Check if email already exists
        if (userRepository.findByEmail(user.getEmail()) != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already registered.");
        }

        try {
            // Updated logic to automatically assign ADMIN role for a specific email pattern
            if (user.getEmail().toLowerCase().endsWith("@admin.com")) {
                user.setRole("ADMIN");
            } else {
                // Ensure other roles are as provided, e.g., "DONOR", "NGO"
                user.setRole(user.getRole().toUpperCase());
            }

            // Note: Hashing the password is a critical security step and should be added
            User savedUser = userRepository.save(user);
            return ResponseEntity.ok(savedUser);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("User registration failed due to data conflict (e.g., duplicate email).");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("User registration failed: " + e.getMessage());
        }
    }

    //  Get all users (for debugging/admin purposes)
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // Simple Login Check
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {
        User dbUser  = userRepository.findByEmail(user.getEmail());
        if (dbUser  != null && dbUser .getPassword().equals(user.getPassword())) {  // Assuming plain-text password match
            // Create a Map for JSON response (Spring auto-converts to application/json)
            Map<String, String> response = new HashMap<>();
            response.put("message", "Welcome " + dbUser .getRole() + "! You can request donations.");
            response.put("role", dbUser .getRole());  // Exact "ADMIN", "NGO", or "DONOR" string from DB
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body("Invalid credentials");
    }

}