package com.paydar.client;

import com.paydar.client.dto.ClientRequest;
import com.paydar.client.dto.ClientResponse;
import com.paydar.domain.client.Client;
import com.paydar.domain.client.ClientRepository;
import com.paydar.domain.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;

    public List<ClientResponse> findAll(User currentUser) {
        return clientRepository
                .findAllByOrganisationIdOrderByNameAsc(currentUser.getOrganisation().getId())
                .stream()
                .map(ClientResponse::from)
                .toList();
    }

    public ClientResponse findById(UUID id, User currentUser) {
        Client client = getOwnedClient(id, currentUser);
        return ClientResponse.from(client);
    }

    @Transactional
    public ClientResponse create(ClientRequest request, User currentUser) {
        Client client = Client.builder()
                .organisation(currentUser.getOrganisation())
                .name(request.name())
                .email(request.email())
                .phone(request.phone())
                .address(request.address())
                .build();
        return ClientResponse.from(clientRepository.save(client));
    }

    @Transactional
    public ClientResponse update(UUID id, ClientRequest request, User currentUser) {
        Client client = getOwnedClient(id, currentUser);
        client.setName(request.name());
        client.setEmail(request.email());
        client.setPhone(request.phone());
        client.setAddress(request.address());
        return ClientResponse.from(clientRepository.save(client));
    }

    @Transactional
    public void delete(UUID id, User currentUser) {
        Client client = getOwnedClient(id, currentUser);
        clientRepository.delete(client);
    }

    private Client getOwnedClient(UUID id, User currentUser) {
        return clientRepository
                .findByIdAndOrganisationId(id, currentUser.getOrganisation().getId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found: " + id));
    }
}
