package com.example.tomcat.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WsConfig implements WebSocketConfigurer {

    private final BenchWebSocketHandler echoWebSocketHandler;
    private final WsChatWebSocketHandler chatWebSocketHandler;

    public WsConfig(BenchWebSocketHandler echoWebSocketHandler, WsChatWebSocketHandler chatWebSocketHandler) {
        this.echoWebSocketHandler = echoWebSocketHandler;
        this.chatWebSocketHandler = chatWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(echoWebSocketHandler, "/ws/echo", "/ws/bench").setAllowedOriginPatterns("*");
        registry.addHandler(chatWebSocketHandler, "/ws/chat").setAllowedOriginPatterns("*");
    }
}
