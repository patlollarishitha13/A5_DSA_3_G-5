package com.neardetect.backend.model;

import java.util.List;

public record AnalysisResponse(
        int documentCount,
        double threshold,
        int shingleSize,
        String algorithm,
        List<ComparisonResult> results,
        int nearDuplicateCount,
        String message
) {
}
