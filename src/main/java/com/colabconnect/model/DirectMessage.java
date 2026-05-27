package com.colabconnect.model;

import java.time.LocalDateTime;

public class DirectMessage {
    private String id;
    private String fromUserId;
    private String toUserId;
    private String content;
    private LocalDateTime timestamp;

    public DirectMessage() {
        this.timestamp = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFromUserId() {
        return fromUserId;
    }

    public void setFromUserId(String fromUserId) {
        this.fromUserId = fromUserId;
    }

    public String getToUserId() {
        return toUserId;
    }

    public void setToUserId(String toUserId) {
        this.toUserId = toUserId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
    }

    // Retained for backwards compatibility if referenced in helper scripts
    public void setTimestammp() {
        this.timestamp = LocalDateTime.now();
    }
}

