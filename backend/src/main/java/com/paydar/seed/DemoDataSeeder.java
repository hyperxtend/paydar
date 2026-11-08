package com.paydar.seed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paydar.domain.client.Client;
import com.paydar.domain.client.ClientRepository;
import com.paydar.domain.invoice.Invoice;
import com.paydar.domain.invoice.InvoiceItem;
import com.paydar.domain.invoice.InvoiceRepository;
import com.paydar.domain.invoice.InvoiceStatus;
import com.paydar.domain.notification.Notification;
import com.paydar.domain.notification.NotificationChannel;
import com.paydar.domain.notification.NotificationRepository;
import com.paydar.domain.notification.NotificationRule;
import com.paydar.domain.notification.NotificationRuleRepository;
import com.paydar.domain.notification.NotificationStatus;
import com.paydar.domain.organisation.Organisation;
import com.paydar.domain.organisation.OrganisationRepository;
import com.paydar.domain.payment.Payment;
import com.paydar.domain.payment.PaymentMethod;
import com.paydar.domain.payment.PaymentRepository;
import com.paydar.domain.user.Role;
import com.paydar.domain.user.User;
import com.paydar.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Seeds demo organisations, users (one per role), clients, invoices in every status,
 * payments, notification rules and notification history for local testing.
 *
 * Only runs with the "seed" profile:  ./mvnw spring-boot:run -Dspring-boot.run.profiles=seed
 * Skips itself if the demo admin already exists, so restarting is safe.
 * All dates are relative to today so the aging report and overdue states stay meaningful.
 */
@Component
@Profile("seed")
@RequiredArgsConstructor
@Slf4j
public class DemoDataSeeder implements ApplicationRunner {

    public static final String PASSWORD = "Paydar123!";

    /** Well-known demo TOTP secret — add it to any authenticator app to log in as the MFA user. */
    public static final String MFA_SECRET = "JBSWY3DPEHPK3PXP";
    public static final List<String> MFA_BACKUP_CODES = List.of(
            "DEMO0001", "DEMO0002", "DEMO0003", "DEMO0004",
            "DEMO0005", "DEMO0006", "DEMO0007", "DEMO0008");

    private static final BigDecimal VAT = new BigDecimal("20");

    private final OrganisationRepository     organisationRepository;
    private final UserRepository             userRepository;
    private final ClientRepository           clientRepository;
    private final InvoiceRepository          invoiceRepository;
    private final PaymentRepository          paymentRepository;
    private final NotificationRuleRepository notificationRuleRepository;
    private final NotificationRepository     notificationRepository;
    private final PasswordEncoder            passwordEncoder;
    private final ObjectMapper               objectMapper;

    private final LocalDate today = LocalDate.now();
    private int invoiceCounter;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (userRepository.existsByEmail("admin@lumen.test")) {
            log.info("Demo data already present — skipping seed");
            return;
        }
        seedLumenStudio();
        seedNorthwind();
        log.info("Demo data seeded — log in with any demo account, password '{}'", PASSWORD);
    }

    // ── Lumen Studio (ZAR) — the main, fully-populated tenant ──────────────

    private void seedLumenStudio() throws Exception {
        invoiceCounter = 0;
        Organisation org = organisationRepository.save(Organisation.builder()
                .name("Lumen Studio Ltd")
                .address("14 Canal Street, Manchester M1 3HE")
                .taxId("GB 123 4567 89")
                .currency("ZAR")
                .build());

        User admin   = user(org, "admin@lumen.test",   "Amara",  "Okafor",  Role.ADMIN);
        User finance = user(org, "finance@lumen.test", "Felix",  "Brennan", Role.FINANCE);
        user(org, "viewer@lumen.test", "Vera", "Lindqvist", Role.VIEWER);

        User mfa = user(org, "mfa@lumen.test", "Milo", "Fischer", Role.ADMIN);
        mfa.setMfaEnabled(true);
        mfa.setMfaSecret(MFA_SECRET);
        mfa.setMfaBackupCodes(objectMapper.writeValueAsString(
                MFA_BACKUP_CODES.stream().map(passwordEncoder::encode).toList()));
        userRepository.save(mfa);

        User disabled = user(org, "disabled@lumen.test", "Dana", "Whitlock", Role.FINANCE);
        disabled.setEnabled(false);
        userRepository.save(disabled);

        Client acme      = client(org, "Acme Robotics Ltd",       "accounts@acme-robotics.test", "+442079460101", "Unit 4, Silicon Way, London E1 6AN");
        Client bluebird  = client(org, "Bluebird Coffee Co.",     "hello@bluebird.test",         "+441614960202", "88 Tib Street, Manchester M4 1LA");
        Client cedar     = client(org, "Cedar & Pine Architects", "billing@cedarpine.test",      null,            "3 Mill Lane, Leeds LS1 4AB");
        Client driftwood = client(org, "Driftwood Surf School",   "ops@driftwood.test",          "+441637960303", "Fistral Beach, Newquay TR7 1HY");
        Client ember     = client(org, "Ember Fitness",           "finance@emberfitness.test",   "+441174960404", "21 Harbourside, Bristol BS1 5TY");
        Client foxglove  = client(org, "Foxglove Florists",       "foxglove@florists.test",      null,            "7 Market Row, York YO1 8RS");
        Client granite   = client(org, "Granite Legal LLP",       "payables@granitelegal.test",  "+441314960505", "1 Castle Terrace, Edinburgh EH1 2DP");
        Client harbour   = client(org, "Harbour Dental Care",     "admin@harbourdental.test",    "+442920180606", "40 Bute Street, Cardiff CF10 5BN");

        // Paid — spread across the last ~5 months so revenue has some history
        Invoice inv1 = invoice(org, acme, InvoiceStatus.SENT, 150, 30, "0", "Website redesign — phase 1",
                item("Discovery & UX workshops", "3", "950.00"),
                item("Visual design system", "1", "2400.00"));
        pay(inv1, finance, PaymentMethod.BANK_TRANSFER, 125, null, "BACS-88213");

        Invoice inv2 = invoice(org, bluebird, InvoiceStatus.SENT, 120, 14, "0", null,
                item("Brand photography (half day)", "1", "650.00"),
                item("Retouched images", "24", "15.00"));
        pay(inv2, finance, PaymentMethod.CARD, 101, null, null);

        Invoice inv3 = invoice(org, granite, InvoiceStatus.SENT, 95, 30, "250.00", "Loyalty discount applied",
                item("Intranet build", "1", "5200.00"),
                item("Accessibility audit", "1", "800.00"));
        pay(inv3, admin, PaymentMethod.BANK_TRANSFER, 80, "3000.00", "Instalment 1");
        pay(inv3, admin, PaymentMethod.BANK_TRANSFER, 66, null, "Instalment 2");

        Invoice inv4 = invoice(org, harbour, InvoiceStatus.SENT, 60, 30, "0", null,
                item("Patient booking widget", "1", "1800.00"),
                item("Monthly hosting", "3", "45.00"));
        pay(inv4, finance, PaymentMethod.STRIPE, 35, null, "pi_demo_3Nf8sQ");

        Invoice inv5 = invoice(org, ember, InvoiceStatus.SENT, 40, 30, "0", null,
                item("Class timetable app — sprint 1", "1", "3200.00"));
        pay(inv5, finance, PaymentMethod.CHEQUE, 12, null, "CHQ 001734");

        // Overdue — one per aging bucket (90+, 61–90, 31–60, 1–30)
        Invoice inv6 = invoice(org, driftwood, InvoiceStatus.OVERDUE, 130, 30, "0", "Second reminder sent",
                item("Booking site rebuild", "1", "2750.00"),
                item("Wetsuit hire integration", "1", "600.00"));

        Invoice inv7 = invoice(org, cedar, InvoiceStatus.OVERDUE, 105, 30, "0", null,
                item("Portfolio site", "1", "4100.00"),
                item("3D render hosting", "6", "35.00"));
        pay(inv7, finance, PaymentMethod.BANK_TRANSFER, 70, "1500.00", "Part payment");
        inv7.setStatus(InvoiceStatus.OVERDUE);

        Invoice inv8 = invoice(org, foxglove, InvoiceStatus.OVERDUE, 75, 30, "0", null,
                item("Seasonal campaign landing pages", "2", "480.00"));

        Invoice inv9 = invoice(org, acme, InvoiceStatus.OVERDUE, 40, 30, "0", "Phase 2 — please quote PO-7731",
                item("Website redesign — phase 2", "1", "3900.00"),
                item("Content migration", "12", "55.00"));

        Invoice inv10 = invoice(org, ember, InvoiceStatus.OVERDUE, 35, 30, "0", null,
                item("Class timetable app — sprint 2", "1", "3200.00"));

        // Open / not yet due
        Invoice inv11 = invoice(org, bluebird, InvoiceStatus.SENT, 20, 30, "0", null,
                item("Menu board designs", "4", "180.00"),
                item("Loyalty card print run", "500", "0.40"));
        pay(inv11, finance, PaymentMethod.CARD, 6, "300.00", null);

        invoice(org, granite, InvoiceStatus.SENT, 10, 30, "0", null,
                item("Retainer — support & maintenance", "1", "1200.00"));

        invoice(org, harbour, InvoiceStatus.SENT, 25, 28, "0", "Due in 3 days — triggers the heads-up reminder",
                item("SEO quick wins", "1", "750.00"));

        invoice(org, acme, InvoiceStatus.SENT, 2, 30, "0", null,
                item("Robot configurator prototype", "1", "6400.00"));

        Invoice dueToday = invoice(org, bluebird, InvoiceStatus.SENT, 30, 30, "0", "Due today",
                item("Pop-up event microsite", "1", "950.00"));

        // Drafts & void
        invoice(org, cedar, InvoiceStatus.DRAFT, 0, 30, "0", "Awaiting sign-off on scope",
                item("Planning portal integration", "1", "2200.00"),
                itemNoTax("Travel expenses", "1", "86.40"));

        invoice(org, driftwood, InvoiceStatus.DRAFT, 0, 14, "0", null,
                item("Summer promo banners", "6", "60.00"));

        invoice(org, foxglove, InvoiceStatus.VOID, 50, 30, "0", "Raised in error — replaced by INV-0008",
                item("Seasonal campaign landing pages", "2", "480.00"));

        // Notification rules
        NotificationRule heads = rule(org, "Friendly heads-up", -3, true, NotificationChannel.EMAIL);
        NotificationRule due   = rule(org, "Due today", 0, true, NotificationChannel.EMAIL, NotificationChannel.IN_APP);
        NotificationRule nudge = rule(org, "First overdue nudge", 7, true, NotificationChannel.EMAIL, NotificationChannel.SMS);
        NotificationRule last  = rule(org, "Final notice", 30, true,
                NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WHATSAPP);
        rule(org, "Quarterly statement (paused)", 60, false, NotificationChannel.EMAIL);

        // Notification history — mix of sent, failed, skipped and pending
        notify(inv6, nudge, NotificationChannel.EMAIL, driftwood.getEmail(), NotificationStatus.SENT, 93, null);
        notify(inv6, nudge, NotificationChannel.SMS, driftwood.getPhone(), NotificationStatus.SENT, 93, null);
        notify(inv6, last, NotificationChannel.EMAIL, driftwood.getEmail(), NotificationStatus.SENT, 70, null);
        notify(inv6, last, NotificationChannel.WHATSAPP, driftwood.getPhone(), NotificationStatus.FAILED, 70,
                "Twilio error 63016: recipient has not opted in to WhatsApp messages");
        notify(inv7, nudge, NotificationChannel.EMAIL, cedar.getEmail(), NotificationStatus.SENT, 68, null);
        notify(inv7, nudge, NotificationChannel.SMS, "", NotificationStatus.SKIPPED, 68,
                "No phone number on record for this client");
        notify(inv8, nudge, NotificationChannel.EMAIL, foxglove.getEmail(), NotificationStatus.FAILED, 38,
                "SMTP connection timed out after 30000ms");
        notify(inv8, last, NotificationChannel.EMAIL, foxglove.getEmail(), NotificationStatus.SENT, 15, null);
        notify(inv9, heads, NotificationChannel.EMAIL, acme.getEmail(), NotificationStatus.SENT, 13, null);
        notify(inv9, nudge, NotificationChannel.EMAIL, acme.getEmail(), NotificationStatus.SENT, 3, null);
        notify(inv9, nudge, NotificationChannel.SMS, acme.getPhone(), NotificationStatus.SENT, 3, null);
        notify(inv10, due, NotificationChannel.IN_APP, admin.getId().toString(), NotificationStatus.SENT, 5, null);
        notify(dueToday, due, NotificationChannel.EMAIL, bluebird.getEmail(), NotificationStatus.PENDING, 0, null);
        notify(inv10, nudge, NotificationChannel.EMAIL, ember.getEmail(), NotificationStatus.PENDING, -2, null);
    }

    // ── Northwind Traders (ZAR) — a second tenant for isolation testing ────

    private void seedNorthwind() {
        invoiceCounter = 0;
        Organisation org = organisationRepository.save(Organisation.builder()
                .name("Northwind Traders Inc.")
                .address("500 Market Street, San Francisco, CA 94105")
                .currency("ZAR")
                .build());

        User owner = user(org, "owner@northwind.test", "Noah", "Castillo", Role.ADMIN);

        Client river  = client(org, "Riverbend Grocers", "ap@riverbend.test", "+14155550111", "12 Elm Ave, Oakland, CA");
        Client summit = client(org, "Summit Outdoor Gear", "billing@summit.test", "+14155550122", "9 Ridge Rd, Boulder, CO");

        Invoice paid = invoice(org, river, InvoiceStatus.SENT, 45, 30, "0", null,
                itemNoTax("Wholesale coffee beans (kg)", "120", "14.50"));
        pay(paid, owner, PaymentMethod.CARD, 20, null, null);

        invoice(org, summit, InvoiceStatus.OVERDUE, 50, 30, "0", null,
                itemNoTax("Trail mix cases", "40", "38.00"));

        invoice(org, river, InvoiceStatus.DRAFT, 0, 30, "0", null,
                itemNoTax("Organic tea assortment", "60", "9.75"));

        rule(org, "Overdue reminder", 5, true, NotificationChannel.EMAIL);
    }

    // ── Builders ───────────────────────────────────────────────────────────

    private User user(Organisation org, String email, String first, String last, Role role) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .firstName(first)
                .lastName(last)
                .role(role)
                .organisation(org)
                .build());
    }

    private Client client(Organisation org, String name, String email, String phone, String address) {
        return clientRepository.save(Client.builder()
                .organisation(org)
                .name(name)
                .email(email)
                .phone(phone)
                .address(address)
                .build());
    }

    private record ItemSpec(String description, BigDecimal quantity, BigDecimal unitPrice, BigDecimal taxRate) {}

    private ItemSpec item(String description, String quantity, String unitPrice) {
        return new ItemSpec(description, new BigDecimal(quantity), new BigDecimal(unitPrice), VAT);
    }

    private ItemSpec itemNoTax(String description, String quantity, String unitPrice) {
        return new ItemSpec(description, new BigDecimal(quantity), new BigDecimal(unitPrice), BigDecimal.ZERO);
    }

    /**
     * Builds an invoice issued {@code issuedDaysAgo} days ago with {@code termDays} payment terms.
     * Totals are calculated the same way as InvoiceService.
     * Numbers follow InvoiceService's INV-0001 sequence so invoices created in the UI continue it.
     */
    private Invoice invoice(Organisation org, Client client, InvoiceStatus status, int issuedDaysAgo, int termDays,
                            String discount, String notes, ItemSpec... specs) {
        LocalDate issueDate = today.minusDays(issuedDaysAgo);
        Invoice invoice = Invoice.builder()
                .organisation(org)
                .client(client)
                .number("INV-%04d".formatted(++invoiceCounter))
                .status(status)
                .issueDate(issueDate)
                .dueDate(issueDate.plusDays(termDays))
                .currency(org.getCurrency())
                .discountAmount(new BigDecimal(discount))
                .notes(notes)
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        List<InvoiceItem> items = new ArrayList<>();
        for (int i = 0; i < specs.length; i++) {
            ItemSpec s = specs[i];
            BigDecimal amount = s.quantity().multiply(s.unitPrice()).setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(amount);
            tax = tax.add(amount.multiply(s.taxRate()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
            items.add(InvoiceItem.builder()
                    .invoice(invoice)
                    .description(s.description())
                    .quantity(s.quantity())
                    .unitPrice(s.unitPrice())
                    .taxRate(s.taxRate())
                    .amount(amount)
                    .sortOrder(i)
                    .build());
        }
        invoice.getItems().addAll(items);
        invoice.setSubtotal(subtotal);
        invoice.setTaxAmount(tax);
        invoice.setTotal(subtotal.add(tax).subtract(invoice.getDiscountAmount()));

        return invoiceRepository.save(invoice);
    }

    /** Records a payment {@code daysAgo} days ago. A null amount pays off the remaining balance. */
    private void pay(Invoice invoice, User recordedBy, PaymentMethod method, int daysAgo, String amount, String reference) {
        BigDecimal value = amount != null ? new BigDecimal(amount) : invoice.getBalanceDue();
        paymentRepository.save(Payment.builder()
                .invoice(invoice)
                .amount(value)
                .currency(invoice.getCurrency())
                .paymentMethod(method)
                .reference(reference)
                .paidAt(daysAgoAt(daysAgo, 10))
                .recordedBy(recordedBy)
                .build());
        invoice.applyPayment(value);
        invoiceRepository.save(invoice);
    }

    private NotificationRule rule(Organisation org, String name, int offset, boolean active, NotificationChannel... channels) {
        return notificationRuleRepository.save(NotificationRule.builder()
                .organisation(org)
                .name(name)
                .triggerDaysOffset(offset)
                .active(active)
                .channels(Set.of(channels))
                .build());
    }

    /** A negative {@code daysAgo} schedules the notification in the future. */
    private void notify(Invoice invoice, NotificationRule rule, NotificationChannel channel, String recipient,
                        NotificationStatus status, int daysAgo, String error) {
        Instant scheduledAt = daysAgoAt(daysAgo, 8);
        notificationRepository.save(Notification.builder()
                .invoice(invoice)
                .rule(rule)
                .channel(channel)
                .recipient(recipient)
                .status(status)
                .scheduledAt(scheduledAt)
                .sentAt(status == NotificationStatus.SENT ? scheduledAt.plus(2, ChronoUnit.MINUTES) : null)
                .errorMessage(error)
                .build());
    }

    private Instant daysAgoAt(int daysAgo, int hourUtc) {
        return today.minusDays(daysAgo).atTime(hourUtc, 0).toInstant(ZoneOffset.UTC);
    }
}
