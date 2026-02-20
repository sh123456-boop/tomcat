package com.example.tomcat.ws;

import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class BenchWebSocketHandler extends TextWebSocketHandler {

    private final WsMetrics wsMetrics;
    private final WsChatService wsChatService;

    public BenchWebSocketHandler(WsMetrics wsMetrics, WsChatService wsChatService) {
        this.wsMetrics = wsMetrics;
        this.wsChatService = wsChatService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        wsMetrics.onOpen();
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        wsMetrics.onMessage();
        String response = wsChatService.handle(message.getPayload());
        session.sendMessage(new TextMessage(response));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        wsMetrics.onClose();
    }
}
