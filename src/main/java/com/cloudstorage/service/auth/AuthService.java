package com.cloudstorage.service.auth;

import com.cloudstorage.dto.auth.RegisterRequest;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();

        user.setName(request.getName());
        user.setEmail(request.getEmail());

        user.setPassword(
                passwordEncoder.encode(request.getPassword())
        );

        user.setRole("USER");

        return userRepository.save(user);
    }
    public User login(String email, String password) {

    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

    if (!passwordEncoder.matches(password, user.getPassword())) {
        throw new RuntimeException("Invalid email or password");
    }

    return user;
}
public void resetPassword(String email, String newPassword) {
    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

    user.setPassword(passwordEncoder.encode(newPassword));
    userRepository.save(user);
}
}