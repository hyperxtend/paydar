package com.paydar.user.dto;

import com.paydar.domain.user.Role;
import com.paydar.domain.user.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        Role role,
        UUID organisationId,
        String organisationName
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                user.getOrganisation().getId(),
                user.getOrganisation().getName()
        );
    }
}
