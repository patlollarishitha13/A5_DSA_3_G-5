package com.neardetect.backend.model;

import tools.jackson.databind.annotation.JsonDeserialize;

import java.util.List;

public record AnalysisRequest(
        @JsonDeserialize(using = StrictDoubleDeserializer.class)
        Double threshold,
        @JsonDeserialize(using = StrictIntegerDeserializer.class)
        Integer shingleSize,
        List<DocumentInput> documents
) {
}
