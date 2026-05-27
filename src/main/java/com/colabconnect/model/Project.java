package com.colabconnect.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Project {
    private String id;
    private String name;
    private String description;
    private String ownerId;
    private List<String> memberIds;
    private List<String> requiredSkills;
    private String status;
    private String type;
    private LocalDateTime createdAt;
    private List<String> completionVotes;
    private LocalDateTime completedAt;

    public Project() {
        this.memberIds = new ArrayList<>();
        this.requiredSkills = new ArrayList<>();
        this.completionVotes = new ArrayList<>();
        this.createdAt = LocalDateTime.now();
        this.status = "open";
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }

    public List<String> getMemberIds() {
        return memberIds;
    }

    public void setMemberIds(List<String> memberIds) {
        this.memberIds = memberIds != null ? memberIds : new ArrayList<>();
    }

    public List<String> getRequiredSkills() {
        return requiredSkills;
    }

    public void setRequiredSkills(List<String> requiredSkills) {
        this.requiredSkills = requiredSkills != null ? requiredSkills : new ArrayList<>();
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public List<String> getCompletionVotes() {
        if (completionVotes == null) completionVotes = new ArrayList<>();
        return completionVotes;
    }

    public void setCompletionVotes(List<String> completionVotes) {
        this.completionVotes = completionVotes != null ? completionVotes : new ArrayList<>();
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}

