package com.paydar.reporting;

import com.paydar.domain.user.User;
import com.paydar.reporting.dto.AgingReport;
import com.paydar.reporting.dto.DashboardMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
public class ReportingController {

    private final ReportingService reportingService;

    /** GET /api/v1/reports/dashboard — headline KPIs */
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetrics> dashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                reportingService.getDashboardMetrics(user.getOrganisation().getId()));
    }

    /** GET /api/v1/reports/aging — AR aging report */
    @GetMapping("/aging")
    public ResponseEntity<AgingReport> aging(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                reportingService.getAgingReport(user.getOrganisation().getId()));
    }

    /** GET /api/v1/reports/invoices.csv — streaming CSV download */
    @GetMapping(value = "/invoices.csv", produces = "text/csv")
    public ResponseEntity<StreamingResponseBody> exportCsv(@AuthenticationPrincipal User user) {
        StreamingResponseBody body = outputStream -> {
            var writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
            reportingService.exportInvoicesCsv(user.getOrganisation().getId(), writer);
            writer.flush();
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoices.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(body);
    }
}
