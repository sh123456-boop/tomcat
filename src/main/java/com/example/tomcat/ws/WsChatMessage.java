package com.example.tomcat.ws;

import java.time.LocalDateTime;

public record WsChatMessage(
        long id,
        String roomId,
        String sender,
        String message,
        LocalDateTime createdAt
) {
}
