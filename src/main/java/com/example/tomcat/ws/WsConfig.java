package com.example.tomcat.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WsConfig implements WebSocketConfigurer {

    private final BenchWebSocketHandler benchWebSocketHandler;

    public WsConfig(BenchWebSocketHandler benchWebSocketHandler) {
        this.benchWebSocketHandler = benchWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(benchWebSocketHandler, "/ws/bench").setAllowedOriginPatterns("*");
    }
}
