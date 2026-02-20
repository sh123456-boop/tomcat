package com.example.tomcat.ws;

import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

@Component
public class WsMetrics {

    private final AtomicLong activeConnections = new AtomicLong();
    private final AtomicLong totalConnections = new AtomicLong();
    private final AtomicLong totalMessages = new AtomicLong();

    public void onOpen() {
        activeConnections.incrementAndGet();
        totalConnections.incrementAndGet();
    }

    public void onClose() {
        activeConnections.decrementAndGet();
    }

    public void onMessage() {
        totalMessages.incrementAndGet();
    }

    public Map<String, Long> snapshot() {
        return Map.of(
                "activeConnections", activeConnections.get(),
                "totalConnections", totalConnections.get(),
                "totalMessages", totalMessages.get()
        );
    }
}
