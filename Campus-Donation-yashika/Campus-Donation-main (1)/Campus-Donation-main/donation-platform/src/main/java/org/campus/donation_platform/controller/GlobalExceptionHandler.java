//package org.campus.donation_platform.controller;
//
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.ControllerAdvice;
//import org.springframework.web.bind.annotation.ExceptionHandler;
//
//@ControllerAdvice
//public class GlobalExceptionHandler {
//
//    @ExceptionHandler(UserNotFoundException.class)
//    public ResponseEntity<String> handleUser NotFound(UserNotFoundException ex) {
//        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
//    }
//
//    @ExceptionHandler(CampaignNotFoundException.class)
//    public ResponseEntity<String> handleCampaignNotFound(CampaignNotFoundException ex) {
//        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
//    }
//
//    // Custom Exceptions (define as static classes or separate)
//    public static class UserNotFoundException extends RuntimeException {
//        public UserNotFoundException(String message) { super(message); }
//    }
//
////    public static class CampaignNotFoundException extends RuntimeException {
////        public CampaignNotFoundException(String message) { super(message); }
////    }
//}
