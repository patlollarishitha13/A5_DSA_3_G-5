package com.neardetect.backend.model;

public record ComparisonResult(
        String documentA,
        String documentB,
        Double similarity,
        Double threshold,
        boolean nearDuplicate
) {
}
