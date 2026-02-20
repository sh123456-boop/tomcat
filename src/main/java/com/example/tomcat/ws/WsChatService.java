package com.example.tomcat.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class WsChatService {

    private final ObjectMapper objectMapper;
    private final WsChatRepository wsChatRepository;

    public WsChatService(ObjectMapper objectMapper, WsChatRepository wsChatRepository) {
        this.objectMapper = objectMapper;
        this.wsChatRepository = wsChatRepository;
    }

    public String handle(String payload) {
        if (!looksLikeJson(payload)) {
            return "echo:" + payload;
        }

        try {
            JsonNode request = objectMapper.readTree(payload);
            String action = requiredText(request, "action").toLowerCase();
            return switch (action) {
                case "save" -> handleSave(request);
                case "read" -> handleRead(request);
                default -> errorResponse("unsupported action: " + action);
            };
        } catch (Exception e) {
            return errorResponse(e.getMessage());
        }
    }

    private String handleSave(JsonNode request) throws Exception {
        String roomId = requiredText(request, "roomId");
        String sender = requiredText(request, "sender");
        String message = requiredText(request, "message");

        WsChatMessage saved = wsChatRepository.save(roomId, sender, message);

        ObjectNode response = objectMapper.createObjectNode();
        response.put("status", "ok");
        response.put("action", "save");
        response.set("message", toMessageNode(saved));
        return objectMapper.writeValueAsString(response);
    }

    private String handleRead(JsonNode request) throws Exception {
        String roomId = requiredText(request, "roomId");
        int limit = sanitizeLimit(request.path("limit").asInt(50));

        List<WsChatMessage> messages = wsChatRepository.findRecent(roomId, limit);

        ObjectNode response = objectMapper.createObjectNode();
        response.put("status", "ok");
        response.put("action", "read");
        response.put("roomId", roomId);
        response.put("count", messages.size());

        ArrayNode array = response.putArray("messages");
        for (WsChatMessage message : messages) {
            array.add(toMessageNode(message));
        }

        return objectMapper.writeValueAsString(response);
    }

    private ObjectNode toMessageNode(WsChatMessage message) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("id", message.id());
        node.put("roomId", message.roomId());
        node.put("sender", message.sender());
        node.put("message", message.message());
        node.put("createdAt", message.createdAt().toString());
        return node;
    }

    private String errorResponse(String reason) {
        try {
            ObjectNode response = objectMapper.createObjectNode();
            response.put("status", "error");
            response.put("reason", reason == null ? "unknown error" : reason);
            return objectMapper.writeValueAsString(response);
        } catch (Exception ignored) {
            return "{\"status\":\"error\",\"reason\":\"serialization failure\"}";
        }
    }

    private String requiredText(JsonNode request, String fieldName) {
        String value = request.path(fieldName).asText("").trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return value;
    }

    private int sanitizeLimit(int limit) {
        if (limit < 1) {
            return 1;
        }
        return Math.min(limit, 200);
    }

    private boolean looksLikeJson(String payload) {
        String trimmed = payload == null ? "" : payload.trim();
        return trimmed.startsWith("{") && trimmed.endsWith("}");
    }
}
