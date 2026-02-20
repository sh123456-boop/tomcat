package com.example.tomcat.ws;

import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WsChatRepository {

    private static final String CREATE_TABLE_SQL = """
            CREATE TABLE IF NOT EXISTS ws_chat_messages (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                room_id VARCHAR(64) NOT NULL,
                sender VARCHAR(64) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ws_chat_room_id_id (room_id, id DESC)
            )
            """;

    private final JdbcTemplate jdbcTemplate;

    public WsChatRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void ensureSchema() {
        jdbcTemplate.execute(CREATE_TABLE_SQL);
    }

    public void sleep(int sleepMs) {
        double seconds = sleepMs / 1000.0;
        jdbcTemplate.queryForObject("SELECT SLEEP(?)", Integer.class, seconds);
    }

    public void save(String roomId, String sender, String message) {
        int updatedRows = jdbcTemplate.update(
                "INSERT INTO ws_chat_messages (room_id, sender, message) VALUES (?, ?, ?)",
                roomId,
                sender,
                message
        );
        if (updatedRows == 0) {
            throw new IllegalStateException("failed to insert message");
        }
    }

    public List<WsChatMessage> findRecent(String roomId, int limit) {
        return jdbcTemplate.query(
                """
                SELECT id, room_id, sender, message, created_at
                FROM ws_chat_messages
                WHERE room_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (rs, rowNum) -> new WsChatMessage(
                        rs.getLong("id"),
                        rs.getString("room_id"),
                        rs.getString("sender"),
                        rs.getString("message"),
                        rs.getObject("created_at", Timestamp.class).toLocalDateTime()
                ),
                roomId,
                limit
        );
    }
}
