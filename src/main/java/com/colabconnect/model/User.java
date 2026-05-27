package com.colabconnect.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class User {
    private String id;
    private String name;
    private String email;
    private String password;
    private String title;
    private String bio;
    private String avatarUrl;
    private List<String> skills;
    private String githubUrl;
    private String portfolioUrl;
    private String availability;
    private List<String> projectTypes;
    private String workStyle;
    private int reliabilityScore;
    private int collaborations;
    private LocalDateTime joinedAt;

    public User() {
        this.skills = new ArrayList<>();
        this.projectTypes = new ArrayList<>();
        this.joinedAt = LocalDateTime.now();
        this.reliabilityScore = 0;
        this.collaborations = 0;
        this.availability = "available";
        this.workStyle = "flexible";
        this.avatarUrl = "";
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills != null ? skills : new ArrayList<>();
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getPortfolioUrl() {
        return portfolioUrl;
    }

    public void setPortfolioUrl(String portfolioUrl) {
        this.portfolioUrl = portfolioUrl;
    }

    public String getAvailability() {
        return availability;
    }

    public void setAvailability(String availability) {
        this.availability = availability;
    }

    public List<String> getProjectTypes() {
        return projectTypes;
    }

    public void setProjectTypes(List<String> projectTypes) {
        this.projectTypes = projectTypes != null ? projectTypes : new ArrayList<>();
    }

    public String getWorkStyle() {
        return workStyle;
    }

    public void setWorkStyle(String workStyle) {
        this.workStyle = workStyle;
    }

    public int getReliabilityScore() {
        return reliabilityScore;
    }

    public void setReliabilityScore(int reliabilityScore) {
        this.reliabilityScore = reliabilityScore;
    }

    public int getCollaborations() {
        return collaborations;
    }

    public void setCollaborations(int collaborations) {
        this.collaborations = collaborations;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(LocalDateTime joinedAt) {
        this.joinedAt = joinedAt != null ? joinedAt : LocalDateTime.now();
    }
}

