package com.paydar.domain.user;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // Fetch the organisation eagerly: JwtAuthFilter loads the principal outside any
    // open session, so a lazy proxy would throw on e.g. getName() in /users/me
    @EntityGraph(attributePaths = "organisation")
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
