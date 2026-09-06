package com.cloudstorage.config;

import com.cloudstorage.security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpMethod;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())

            .cors(cors ->
                cors.configurationSource(corsConfigurationSource())
            )

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                // Browser preflight
                .requestMatchers(
                    HttpMethod.OPTIONS,
                    "/**"
                ).permitAll()

                // Login/register
                .requestMatchers(
                    "/api/auth/**"
                ).permitAll()

                // Public files
                .requestMatchers(
                    "/api/public/**"
                ).permitAll()

                // Folder APIs
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/folders/**"
                ).authenticated()

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/folders/**"
                ).authenticated()

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/folders/**"
                ).authenticated()

                // File APIs
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/files/**"
                ).authenticated()

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/files/**"
                ).authenticated()

                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/files/**"
                ).authenticated()

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/files/**"
                ).authenticated()

                // Everything else
                .anyRequest().authenticated()
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
            new CorsConfiguration();

        configuration.setAllowedOrigins(
            List.of(
                "http://localhost:5173"
            )
        );

        configuration.setAllowedMethods(
            List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
            )
        );

        configuration.setAllowedHeaders(
            List.of(
                "*"
            )
        );

        configuration.setExposedHeaders(
            List.of(
                "Authorization",
                "Content-Disposition"
            )
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
            new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
            "/**",
            configuration
        );

        return source;
    }
}