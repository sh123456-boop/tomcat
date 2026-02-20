package com.example.tomcat.bench.repository;

import com.example.tomcat.bench.model.BenchItem;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BenchRepository {

    private final JdbcTemplate jdbcTemplate;

    public BenchRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void sleep(int sleepMs) {
        double seconds = sleepMs / 1000.0;
        jdbcTemplate.queryForObject("SELECT SLEEP(?)", Integer.class, seconds);
    }

    public Optional<BenchItem> findById(long id) {
        List<BenchItem> rows = jdbcTemplate.query(
                "SELECT id, payload, cnt FROM bench_items WHERE id = ?",
                (rs, rowNum) -> new BenchItem(
                        rs.getLong("id"),
                        rs.getString("payload"),
                        rs.getLong("cnt")
                ),
                id
        );
        return rows.stream().findFirst();
    }

    public int incrementCount(long id, long delta) {
        return jdbcTemplate.update(
                "UPDATE bench_items SET cnt = cnt + ? WHERE id = ?",
                delta,
                id
        );
    }

    public Optional<Long> findCountById(long id) {
        List<Long> rows = jdbcTemplate.query(
                "SELECT cnt FROM bench_items WHERE id = ?",
                (rs, rowNum) -> rs.getLong("cnt"),
                id
        );
        return rows.stream().findFirst();
    }
}
