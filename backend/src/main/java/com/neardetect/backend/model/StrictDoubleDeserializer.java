package com.neardetect.backend.model;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

public class StrictDoubleDeserializer extends ValueDeserializer<Double> {

    @Override
    public Double deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
        if (!parser.hasToken(JsonToken.VALUE_NUMBER_INT)
                && !parser.hasToken(JsonToken.VALUE_NUMBER_FLOAT)) {
            return context.reportInputMismatch(Double.class, "Threshold must be a number.");
        }

        return parser.getDoubleValue();
    }
}
