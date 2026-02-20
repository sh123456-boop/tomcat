package com.example.tomcat.bench.model;

public record DbReadResponse(long id, String payload, long cnt, int sleptMs) {
}
