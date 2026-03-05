package org.campus.donation_platform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.campus.donation_platform.model.Campaign;
import org.campus.donation_platform.model.User;
import org.campus.donation_platform.repository.CampaignRepository;
import org.campus.donation_platform.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;  // Loads web layer + controller
import org.springframework.boot.test.mock.mockito.MockBean;  //  suppress warning below
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;


import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SuppressWarnings("deprecation")  // Silences @MockBean warning (safe for Spring Boot 3.5.5)
@WebMvcTest(CampaignController.class)  // Loads ONLY your controller + web layer (no full app/DB)
class CampaignControllerTest {

    @Autowired
    private MockMvc mockMvc;  // Simulates HTTP requests

    @Autowired
    private ObjectMapper objectMapper;  // For JSON

    @MockBean  // Mocks repo (replaces real one in test context)
    private CampaignRepository campaignRepository;

    @MockBean  // Mocks user repo
    private UserRepository userRepository;

    @Test
    void createCampaign_validInput_shouldReturnSuccess() throws Exception {
        // Arrange: Setup mocks for success
        User mockUser  = new User();  // Adjust setters if needed
        mockUser .setId(9L);  // Matches your ngo_id=9
        mockUser .setEmail("ngo@gmail.com");
        when(userRepository.findByEmail(eq("ngo@gmail.com"))).thenReturn(mockUser );

        Campaign mockSavedCampaign = new Campaign();
        mockSavedCampaign.setId(15L);  // Example ID
        when(campaignRepository.save(any(Campaign.class))).thenReturn(mockSavedCampaign);

        // Mock request body
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("title", "Educating Less the fortunate");
        requestBody.put("description", "fhfafbkjcb");
        requestBody.put("goal", "2000");

        // Act & Assert
        mockMvc.perform(post("/campaigns/create")
                        .header("User-Email", "ngo@gmail.com")  // Exact header (including spaces)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())  // Now 200 (controller loaded)
                .andExpect(jsonPath("$.message").value("Campaign created successfully!"))
                .andExpect(jsonPath("$.campaignId").value(15));
    }

    @Test
    void createCampaign_missingEmailHeader_shouldReturnBadRequest() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("title", "Test Campaign");
        requestBody.put("description", "Test Desc");
        requestBody.put("goal", "1000");

        mockMvc.perform(post("/campaigns/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())  // 400 from your validation
                .andExpect(jsonPath("$.error").value("NGO email is required in the 'User -Email' header. Please log in again."));
    }

    @Test
    void createCampaign_invalidGoal_shouldReturnBadRequest() throws Exception {
        User mockUser  = new User();
        mockUser .setId(9L);
        mockUser .setEmail("ngo@gmail.com");
        when(userRepository.findByEmail(eq("ngo@gmail.com"))).thenReturn(mockUser );

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("title", "Test Campaign");
        requestBody.put("description", "Test Desc");
        requestBody.put("goal", "invalid-number");  // Triggers NumberFormatException

        mockMvc.perform(post("/campaigns/create")
                        .header("User    -Email", "ngo@gmail.com")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid goal value: Must be a number."));
    }

    @Test
    void getActiveCampaigns_shouldReturnActiveList() throws Exception {
        Campaign campaign1 = new Campaign();
        campaign1.setId(1L);
        campaign1.setTitle("Active Campaign 1");
        campaign1.setStatus("ACTIVE");
        campaign1.setGoal(BigDecimal.valueOf(1000));
        campaign1.setCurrentAmount(BigDecimal.ZERO);

        Campaign campaign2 = new Campaign();
        campaign2.setId(2L);
        campaign2.setTitle("Active Campaign 2");
        campaign2.setStatus("ACTIVE");
        campaign2.setGoal(BigDecimal.valueOf(2000));
        campaign2.setCurrentAmount(BigDecimal.valueOf(500));

        List<Campaign> activeList = Arrays.asList(campaign1, campaign2);
        when(campaignRepository.findByStatus(eq("ACTIVE"))).thenReturn(activeList);

        mockMvc.perform(get("/campaigns/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Active Campaign 1"))
                .andExpect(jsonPath("$[1].currentAmount").value(500));
    }

    @Test
    void getActiveCampaigns_noActiveCampaigns_shouldReturnEmptyArray() throws Exception {
        when(campaignRepository.findByStatus(eq("active"))).thenReturn(Arrays.asList());

        mockMvc.perform(get("/campaigns/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }





    @Test
    void donateToCampaign_inactiveCampaign_shouldReturnBadRequest() throws Exception {
        Campaign mockCampaign = new Campaign();
        mockCampaign.setId(1L);
        mockCampaign.setStatus("completed");  // Not active
        when(campaignRepository.findById(eq(1L))).thenReturn(Optional.of(mockCampaign));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("amount", "100");

        mockMvc.perform(post("/campaigns/1/donate")
                        .header("User  -Email", "donor@gmail.com")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("This campaign is no longer active for donations."));
    }

    @Test
    void donateToCampaign_missingDonorEmail_shouldReturnBadRequest() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("amount", "100");

        mockMvc.perform(post("/campaigns/1/donate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Donor email is required in the 'User  -Email' header. Please log in."));
    }

    @Test
    void donateToCampaign_invalidAmount_shouldReturnBadRequest() throws Exception {
        Campaign mockCampaign = new Campaign();
        mockCampaign.setId(1L);
        mockCampaign.setStatus("active");
        when(campaignRepository.findById(eq(1L))).thenReturn(Optional.of(mockCampaign));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("amount", "invalid");

        mockMvc.perform(post("/campaigns/1/donate")
                        .header("User    -Email", "donor@gmail.com")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid donation amount: Must be a positive number."));
    }

    @Test
    void donateToCampaign_campaignNotFound_shouldReturnBadRequest() throws Exception {
        when(campaignRepository.findById(eq(999L))).thenReturn(Optional.empty());

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("amount", "100");

        mockMvc.perform(post("/campaigns/999/donate")
                        .header("User  -Email", "donor@gmail.com")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Campaign not found with ID: 999"));
    }
}
