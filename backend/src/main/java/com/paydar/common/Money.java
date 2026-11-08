package com.paydar.common;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;

/**
 * Formats amounts with their currency symbol, e.g. "R12,345.67", for notifications and PDFs.
 * Codes without a listed symbol fall back to the ISO code ("KES 1,200.00"). Symbols are kept
 * to what the PDF's built-in Helvetica (WinAnsi) can render.
 */
public final class Money {

    public static final String DEFAULT_CURRENCY = "ZAR";

    private static final Map<String, String> SYMBOLS = Map.of(
            "ZAR", "R",
            "USD", "$",
            "EUR", "€",
            "GBP", "£",
            "JPY", "¥",
            "BWP", "P",
            "NAD", "N$"
    );

    private Money() {}

    public static String format(BigDecimal amount, String currency) {
        String code   = currency != null ? currency : DEFAULT_CURRENCY;
        String prefix = SYMBOLS.getOrDefault(code, code + " ");
        BigDecimal value = amount != null ? amount : BigDecimal.ZERO;
        return String.format(Locale.US, "%s%s%,.2f", value.signum() < 0 ? "-" : "", prefix, value.abs());
    }
}
