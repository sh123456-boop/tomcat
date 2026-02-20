package com.example.tomcat.ws;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WsStatsController {

    private final WsMetrics wsMetrics;

    public WsStatsController(WsMetrics wsMetrics) {
        this.wsMetrics = wsMetrics;
    }

    @GetMapping("/api/v1/ws/stats")
    public Map<String, Long> stats() {
        return wsMetrics.snapshot();
    }
}
