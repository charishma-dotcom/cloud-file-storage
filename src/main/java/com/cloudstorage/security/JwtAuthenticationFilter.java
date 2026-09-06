package com.cloudstorage.security;

import com.cloudstorage.service.auth.JwtService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.stereotype.Component;

import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter
        extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(
            JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // CORS preflight does not need JWT
        if ("OPTIONS".equalsIgnoreCase(
                request.getMethod())) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }

        String authorization =
                request.getHeader("Authorization");

        System.out.println(
                ">>> " +
                request.getMethod() +
                " " +
                request.getRequestURI()
        );

        System.out.println(
                ">>> Authorization header present: " +
                (authorization != null)
        );

        if (authorization != null &&
                authorization.startsWith("Bearer ")) {

            String token =
                    authorization.substring(7).trim();

            try {

                if (jwtService.isTokenValid(token)) {

                    String email =
                            jwtService.extractEmail(token);

                    System.out.println(
                            ">>> JWT USER: " + email
                    );

                    UsernamePasswordAuthenticationToken
                            authentication =
                            new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    Collections.emptyList()
                            );

                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(
                                    authentication
                            );

                } else {

                    System.out.println(
                            ">>> JWT INVALID"
                    );

                }

            } catch (Exception e) {

                System.out.println(
                        ">>> JWT ERROR: " +
                        e.getMessage()
                );

                SecurityContextHolder
                        .clearContext();
            }
        }

        filterChain.doFilter(
                request,
                response
        );
    }
}