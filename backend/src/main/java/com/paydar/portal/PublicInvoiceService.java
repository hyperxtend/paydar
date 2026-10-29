package com.paydar.portal;

import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicInvoiceService {

    private final InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public PublicInvoiceResponse findByToken(UUID token) {
        return PublicInvoiceResponse.from(findInvoiceByToken(token));
    }

    @Transactional(readOnly = true)
    public Invoice findInvoiceByToken(UUID token) {
        return invoiceRepository.findByShareToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
    }
}
