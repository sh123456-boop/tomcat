package com.example.tomcat.bench.api;

import com.example.tomcat.bench.model.DbReadResponse;
import com.example.tomcat.bench.model.PingResponse;
import com.example.tomcat.bench.model.TxRequest;
import com.example.tomcat.bench.model.TxResponse;
import com.example.tomcat.bench.service.BenchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BenchController {

    private final BenchService benchService;

    public BenchController(BenchService benchService) {
        this.benchService = benchService;
    }

    @GetMapping("/api/v1/ping")
    public PingResponse ping() {
        return new PingResponse(true);
    }

    @GetMapping("/api/v1/io/db/read")
    public DbReadResponse read(
            @RequestParam("id") long id,
            @RequestParam(value = "sleepMs", defaultValue = "80") int sleepMs
    ) {
        return benchService.readWithSleep(id, sleepMs);
    }

    @PostMapping("/api/v1/io/db/tx")
    public TxResponse tx(
            @RequestBody TxRequest request,
            @RequestParam(value = "sleepMs", defaultValue = "30") int sleepMs
    ) {
        return benchService.incrementInTransaction(request, sleepMs);
    }
}
