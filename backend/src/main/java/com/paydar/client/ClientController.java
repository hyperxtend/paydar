package com.paydar.client;

import com.paydar.client.dto.ClientRequest;
import com.paydar.client.dto.ClientResponse;
import com.paydar.domain.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public ResponseEntity<List<ClientResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clientService.findAll(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clientService.findById(id, user));
    }

    @PostMapping
    public ResponseEntity<ClientResponse> create(
            @Valid @RequestBody ClientRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.create(request, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ClientRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clientService.update(id, request, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        clientService.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
