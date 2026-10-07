package com.neardetect.backend.controller;

import com.neardetect.backend.model.AnalysisRequest;
import com.neardetect.backend.model.AnalysisResponse;
import com.neardetect.backend.model.ComparisonResult;
import com.neardetect.backend.model.DocumentInput;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @GetMapping("/test")
    public Map<String, String> test() {
        return Map.of("status", "Document API is working!");
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(@RequestParam("threshold") Double threshold,
                                           @RequestParam(value = "shingleSize", required = false) Integer shingleSize,
                                           @RequestParam("documents") List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No documents were uploaded."));
        }

        List<DocumentInput> documents = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            try {
                String content = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
                documents.add(new DocumentInput(file.getOriginalFilename(), content));
            } catch (IOException ex) {
                return ResponseEntity.badRequest().body(Map.of("message", "Unable to read one or more uploaded files."));
            }
        }

        if (documents.size() < 2) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please upload at least two documents."));
        }

        return analyze(new AnalysisRequest(threshold, shingleSize, documents));
    }

    @PostMapping("/manual")
    public ResponseEntity<?> analyzeManualDocuments(@RequestBody AnalysisRequest request) {
        return analyze(request);
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody AnalysisRequest request) {
        if (request == null || request.documents() == null || request.documents().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No documents available for analysis."));
        }

        if (request.documents().size() < 2) {
            return ResponseEntity.badRequest().body(Map.of("message", "Add at least two non-empty documents before running analysis."));
        }

        if (!isValidThreshold(request.threshold())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Threshold must be a number between 0 and 100."));
        }

        if (!isValidShingleSize(request.shingleSize())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Shingle size must be an integer from 2 to 6."));
        }

        double thresholdPercent = request.threshold();
        int shingleSize = request.shingleSize();

        List<DocumentInput> validDocuments = request.documents().stream()
                .filter(document -> document != null)
                .map(document -> new DocumentInput(
                        document.name() == null || document.name().isBlank() ? "Untitled Document" : document.name().trim(),
                        document.text() == null ? "" : document.text().trim()))
                .toList();

        if (validDocuments.size() != request.documents().size()
                || validDocuments.stream().anyMatch(document -> document.text().isBlank())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Add at least two non-empty documents before running analysis."));
        }

        List<ComparisonResult> results = new ArrayList<>();
        for (int i = 0; i < validDocuments.size(); i++) {
            for (int j = i + 1; j < validDocuments.size(); j++) {
                DocumentInput left = validDocuments.get(i);
                DocumentInput right = validDocuments.get(j);

                double similarity = calculateJaccardSimilarity(left, right, shingleSize);
                boolean nearDuplicate = similarity >= thresholdPercent;

                results.add(new ComparisonResult(
                        left.name(),
                        right.name(),
                        similarity,
                        thresholdPercent,
                        nearDuplicate
                ));
            }
        }

        int nearDuplicateCount = (int) results.stream().filter(ComparisonResult::nearDuplicate).count();
        AnalysisResponse response = new AnalysisResponse(
                validDocuments.size(),
                thresholdPercent,
                shingleSize,
                "Shingling → Jaccard similarity → Threshold classification",
                results,
                nearDuplicateCount,
                nearDuplicateCount > 0 ? "Near duplicates found." : "No near duplicates found for the current document set."
        );

        return ResponseEntity.ok(response);
    }

    private boolean isValidThreshold(Double threshold) {
        return threshold != null && Double.isFinite(threshold) && threshold >= 0.0 && threshold <= 100.0;
    }

    private boolean isValidShingleSize(Integer shingleSize) {
        return shingleSize != null && shingleSize >= 2 && shingleSize <= 6;
    }

    private double calculateJaccardSimilarity(DocumentInput left, DocumentInput right, int shingleSize) {
        Set<String> leftShingles = buildShingles(preprocess(left.text()), shingleSize);
        Set<String> rightShingles = buildShingles(preprocess(right.text()), shingleSize);

        if (leftShingles.isEmpty() || rightShingles.isEmpty()) {
            return 0.0;
        }

        Set<String> intersection = new LinkedHashSet<>(leftShingles);
        intersection.retainAll(rightShingles);

        Set<String> union = new LinkedHashSet<>(leftShingles);
        union.addAll(rightShingles);

        double jaccard = (double) intersection.size() / union.size();
        return Math.round(jaccard * 10000.0) / 100.0;
    }

    private String preprocess(String text) {
        if (text == null) {
            return "";
        }

        return text.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private Set<String> buildShingles(String text, int shingleSize) {
        Set<String> shingles = new LinkedHashSet<>();
        String[] words = text.split(" ");

        if (words.length < shingleSize) {
            return shingles;
        }

        for (int i = 0; i <= words.length - shingleSize; i++) {
            StringBuilder builder = new StringBuilder();
            for (int j = i; j < i + shingleSize; j++) {
                if (j > i) {
                    builder.append(" ");
                }
                builder.append(words[j]);
            }
            String token = builder.toString().trim();
            if (!token.isBlank()) {
                shingles.add(token);
            }
        }

        return shingles;
    }
}