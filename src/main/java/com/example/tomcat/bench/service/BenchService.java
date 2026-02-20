package com.example.tomcat.bench.service;

import com.example.tomcat.bench.model.BenchItem;
import com.example.tomcat.bench.model.DbReadResponse;
import com.example.tomcat.bench.model.TxRequest;
import com.example.tomcat.bench.model.TxResponse;
import com.example.tomcat.bench.repository.BenchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BenchService {

    private final BenchRepository benchRepository;

    public BenchService(BenchRepository benchRepository) {
        this.benchRepository = benchRepository;
    }

    public DbReadResponse readWithSleep(long id, int sleepMs) {
        validateSleepMs(sleepMs);
        benchRepository.sleep(sleepMs);

        BenchItem item = benchRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("bench item not found. id=" + id));

        return new DbReadResponse(item.id(), item.payload(), item.cnt(), sleepMs);
    }

    @Transactional
    public TxResponse incrementInTransaction(TxRequest request, int sleepMs) {
        validateSleepMs(sleepMs);
        if (sleepMs > 0) {
            benchRepository.sleep(sleepMs);
        }

        int updatedRows = benchRepository.incrementCount(request.id(), request.delta());
        if (updatedRows == 0) {
            throw new IllegalStateException("bench item not found. id=" + request.id());
        }

        long cnt = benchRepository.findCountById(request.id())
                .orElseThrow(() -> new IllegalStateException("bench item not found after update. id=" + request.id()));

        return new TxResponse(request.id(), cnt, request.delta(), sleepMs);
    }

    private void validateSleepMs(int sleepMs) {
        if (sleepMs < 0) {
            throw new IllegalArgumentException("sleepMs must be >= 0");
        }
    }
}
