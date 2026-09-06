package com.cloudstorage.controller.auth;

import com.cloudstorage.dto.auth.LoginRequest;
import com.cloudstorage.dto.auth.RegisterRequest;
import com.cloudstorage.model.User;
import com.cloudstorage.service.auth.AuthService;
import com.cloudstorage.service.auth.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(
            AuthService authService,
            JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<User> register(
            @Valid @RequestBody RegisterRequest request) {

        User user = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(user);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @Valid @RequestBody LoginRequest request) {

        User user = authService.login(
                request.getEmail(),
                request.getPassword()
        );

        String token = jwtService.generateToken(user.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());

        return ResponseEntity.ok(response);
    }
@PostMapping("/reset-password")
public ResponseEntity<?> resetPassword(
        @RequestBody Map<String, String> request) {

    try {
        authService.resetPassword(
                request.get("email"),
                request.get("password")
        );

        return ResponseEntity.ok(
                Map.of("message", "Password reset successfully")
        );

    } catch (RuntimeException e) {
        return ResponseEntity.badRequest()
                .body(e.getMessage());
    }
}
}