package com.neardetect.backend;

import com.neardetect.backend.controller.DocumentController;
import com.neardetect.backend.model.AnalysisRequest;
import com.neardetect.backend.model.AnalysisResponse;
import com.neardetect.backend.model.DocumentInput;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BackendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void analysisUsesRequestedShingleSizeForShinglesAndReturnsIt() {
		DocumentController controller = new DocumentController();
		List<DocumentInput> documents = List.of(
				new DocumentInput("first", "one two three four five six"),
				new DocumentInput("second", "one two three four five seven")
		);

		assertAnalysis(controller, documents, 2, 66.67);
		assertAnalysis(controller, documents, 3, 60.0);
		assertAnalysis(controller, documents, 4, 50.0);
		assertAnalysis(controller, documents, 5, 33.33);
		assertAnalysis(controller, documents, 6, 0.0);
	}

	@Test
	void analysisKeepsUsingRequestedThreshold() {
		DocumentController controller = new DocumentController();
		AnalysisRequest request = new AnalysisRequest(50.0, 4, List.of(
				new DocumentInput("first", "one two three four five six"),
				new DocumentInput("second", "one two three four five seven")
		));

		ResponseEntity<?> response = controller.analyze(request);
		assertEquals(HttpStatus.OK, response.getStatusCode());
		AnalysisResponse analysis = (AnalysisResponse) response.getBody();
		assertNotNull(analysis);
		assertEquals(50.0, analysis.threshold());
		assertEquals(50.0, analysis.results().get(0).threshold());
		assertTrue(analysis.results().get(0).nearDuplicate());
	}

	@Test
	void analysisRejectsMissingOrInsufficientDocuments() {
		DocumentController controller = new DocumentController();

		assertEquals(HttpStatus.BAD_REQUEST, controller.analyze(
				new AnalysisRequest(70.0, 3, List.of())
		).getStatusCode());
		assertEquals(HttpStatus.BAD_REQUEST, controller.analyze(
				new AnalysisRequest(70.0, 3, List.of(new DocumentInput("first", "one two three")))
		).getStatusCode());
		assertEquals(HttpStatus.BAD_REQUEST, controller.analyze(
				new AnalysisRequest(70.0, 3, List.of(
						new DocumentInput("first", "one two three"),
						new DocumentInput("second", " ")
				))
		).getStatusCode());
	}

	@Test
	void analysisRejectsInvalidParametersInsteadOfSilentlyChangingThem() {
		DocumentController controller = new DocumentController();
		List<DocumentInput> documents = List.of(
				new DocumentInput("first", "one two three"),
				new DocumentInput("second", "one two four")
		);

		assertEquals(HttpStatus.BAD_REQUEST, controller.analyze(
				new AnalysisRequest(101.0, 3, documents)
		).getStatusCode());
		assertEquals(HttpStatus.BAD_REQUEST, controller.analyze(
				new AnalysisRequest(70.0, 1, documents)
		).getStatusCode());
		assertEquals(HttpStatus.BAD_REQUEST, controller.analyze(
				new AnalysisRequest(70.0, null, documents)
		).getStatusCode());
	}

	@Test
	void shingleSizeDoesNotFallBackToShorterShingles() {
		DocumentController controller = new DocumentController();
		ResponseEntity<?> response = controller.analyze(new AnalysisRequest(0.0, 4, List.of(
				new DocumentInput("first", "same words"),
				new DocumentInput("second", "same words")
		)));

		assertEquals(HttpStatus.OK, response.getStatusCode());
		AnalysisResponse analysis = (AnalysisResponse) response.getBody();
		assertNotNull(analysis);
		assertEquals(0.0, analysis.results().get(0).similarity());
		assertEquals(4, analysis.shingleSize());
	}

	@Test
	void analyzeEndpointAcceptsFrontendJsonAndRejectsFractionalShingleSize() throws Exception {
		String request = """
				{
				  "threshold": 60,
				  "shingleSize": 3,
				  "documents": [
				    {"name": "first", "text": "one two three four five six"},
				    {"name": "second", "text": "one two three four five seven"}
				  ]
				}
				""";

		mockMvc.perform(post("/api/documents/analyze")
						.contentType(MediaType.APPLICATION_JSON)
						.content(request))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.documentCount").value(2))
				.andExpect(jsonPath("$.shingleSize").value(3))
				.andExpect(jsonPath("$.threshold").value(60.0))
				.andExpect(jsonPath("$.results[0].similarity").value(60.0))
				.andExpect(jsonPath("$.results[0].nearDuplicate").value(true));

		mockMvc.perform(post("/api/documents/analyze")
						.contentType(MediaType.APPLICATION_JSON)
						.content(request.replace("\"shingleSize\": 3", "\"shingleSize\": 3.5")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(
						"Request must contain valid JSON with numeric threshold, integer shingleSize, and a documents array."
				));

		mockMvc.perform(post("/api/documents/analyze")
						.contentType(MediaType.APPLICATION_JSON)
						.content(request.replace("\"threshold\": 60", "\"threshold\": \"60\"")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(
						"Request must contain valid JSON with numeric threshold, integer shingleSize, and a documents array."
				));
	}

	private void assertAnalysis(
			DocumentController controller,
			List<DocumentInput> documents,
			int requestedShingleSize,
			double expectedSimilarity
	) {
		ResponseEntity<?> response = controller.analyze(
				new AnalysisRequest(40.0, requestedShingleSize, documents)
		);

		assertEquals(HttpStatus.OK, response.getStatusCode());
		AnalysisResponse analysis = (AnalysisResponse) response.getBody();
		assertNotNull(analysis);
		assertEquals(requestedShingleSize, analysis.shingleSize());
		assertEquals(expectedSimilarity, analysis.results().get(0).similarity());
	}
}
