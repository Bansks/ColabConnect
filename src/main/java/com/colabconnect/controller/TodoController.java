package com.colabconnect.controller;

import com.colabconnect.model.Project;
import com.colabconnect.model.TodoTask;
import com.colabconnect.model.User;
import com.colabconnect.repository.ProjectRepository;
import com.colabconnect.repository.SessionRepository;
import com.colabconnect.repository.TodoTaskRepository;
import com.colabconnect.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.http.MediaType;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/cc/projects/{projectId}/todos")
public class TodoController {

    private final TodoTaskRepository todoTaskRepository;
    private final ProjectRepository projectRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public TodoController(TodoTaskRepository todoTaskRepository,
                          ProjectRepository projectRepository,
                          SessionRepository sessionRepository,
                          UserRepository userRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.todoTaskRepository = todoTaskRepository;
        this.projectRepository = projectRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    private String resolveUserId(String token) {
        if (token == null || token.isEmpty()) return null;
        return sessionRepository.getUserIdFromSession(token);
    }

    @GetMapping
    public ResponseEntity<?> getTasks(
            @PathVariable String projectId,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Project project = projectRepository.getProjectById(projectId);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));

        if (!project.getMemberIds().contains(userId)) {
            return ResponseEntity.status(403).body(Map.of("message", "You must be a member of this project to view tasks"));
        }

        List<TodoTask> tasks = todoTaskRepository.getTasksByProjectId(projectId).stream()
                .sorted(Comparator.comparing(TodoTask::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(tasks);
    }

    @PostMapping
    public ResponseEntity<?> createTask(
            @PathVariable String projectId,
            @RequestBody Map<String, Object> body,
            @CookieValue(value = "cc_token", required = false) String token) {

        // Authenticate
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        // Look up project
        Project project = projectRepository.getProjectById(projectId);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));

        // Only project members may create tasks
        if (!project.getMemberIds().contains(userId)) {
            return ResponseEntity.status(403).body(Map.of("message", "You must be a member of this project to create tasks"));
        }

        // Validate title
        Object titleObj = body.get("title");
        if (titleObj == null) {
            return ResponseEntity.status(400).body(Map.of("message", "Title is required (max 200 chars)"));
        }
        String title = titleObj.toString().trim();
        if (title.isEmpty() || title.length() > 200) {
            return ResponseEntity.status(400).body(Map.of("message", "Title is required (max 200 chars)"));
        }

        // Validate description (optional, max 2000 chars)
        String description = "";
        Object descObj = body.get("description");
        if (descObj != null) {
            description = descObj.toString();
            if (description.length() > 2000) {
                return ResponseEntity.status(400).body(Map.of("message", "Description must not exceed 2000 characters"));
            }
        }

        // Validate assigneeId
        Object assigneeIdObj = body.get("assigneeId");
        if (assigneeIdObj == null) {
            return ResponseEntity.status(400).body(Map.of("message", "Assignee must be a project member"));
        }
        String assigneeId = assigneeIdObj.toString();
        if (!project.getMemberIds().contains(assigneeId)) {
            return ResponseEntity.status(400).body(Map.of("message", "Assignee must be a project member"));
        }

        // Validate priority (default "medium")
        String priority;
        Object priorityObj = body.get("priority");
        if (priorityObj == null || priorityObj.toString().trim().isEmpty()) {
            priority = "medium";
        } else {
            priority = priorityObj.toString().trim();
            if (!priority.equals("low") && !priority.equals("medium") && !priority.equals("high")) {
                return ResponseEntity.status(400).body(Map.of("message", "Invalid priority"));
            }
        }

        // Parse dueDate (optional, ISO format YYYY-MM-DD)
        LocalDate dueDate = null;
        Object dueDateObj = body.get("dueDate");
        if (dueDateObj != null && !dueDateObj.toString().trim().isEmpty()) {
            try {
                dueDate = LocalDate.parse(dueDateObj.toString().trim());
            } catch (DateTimeParseException e) {
                return ResponseEntity.status(400).body(Map.of("message", "Invalid dueDate format, expected YYYY-MM-DD"));
            }
        }

        // Look up assignee name
        User assignee = userRepository.getUserById(assigneeId);
        String assigneeName = (assignee != null && assignee.getName() != null) ? assignee.getName() : "Unknown";

        // Build the task
        LocalDateTime now = LocalDateTime.now();
        TodoTask task = new TodoTask();
        task.setId(UUID.randomUUID().toString());
        task.setProjectId(projectId);
        task.setTitle(title);
        task.setDescription(description);
        task.setAssigneeId(assigneeId);
        task.setAssigneeName(assigneeName);
        task.setCreatedById(userId);
        task.setDueDate(dueDate);
        task.setPriority(priority);
        task.setStatus("pending");
        task.setCreatedAt(now);
        task.setUpdatedAt(now);

        // Persist
        TodoTask saved = todoTaskRepository.saveTask(task);

        // Broadcast WebSocket event
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", "TASK_CREATED");
        event.put("task", saved);
        messagingTemplate.convertAndSend("/topic/project/" + projectId, event);

        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{taskId}")
    public ResponseEntity<?> updateTask(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @RequestBody Map<String, Object> body,
            @CookieValue(value = "cc_token", required = false) String token) {

        // Authenticate
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        // Look up project
        Project project = projectRepository.getProjectById(projectId);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));

        // Look up task
        TodoTask task = todoTaskRepository.getTaskById(taskId);
        if (task == null || !projectId.equals(task.getProjectId())) {
            return ResponseEntity.status(404).body(Map.of("message", "Task not found"));
        }

        boolean isOwner = project.getOwnerId().equals(userId);
        boolean isAssignee = userId.equals(task.getAssigneeId());
        boolean isCreator = userId.equals(task.getCreatedById());

        if (!isOwner && !isAssignee && !isCreator) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not authorized to update this task"));
        }

        if (isAssignee && !isOwner && !isCreator) {
            // Assignee may only update the status field; any other field in the body → 403
            Set<String> allowedKeys = Set.of("status");
            for (String key : body.keySet()) {
                if (!allowedKeys.contains(key)) {
                    return ResponseEntity.status(403).body(Map.of("message", "Members can only update the status of their assigned tasks"));
                }
            }

            // Validate status value
            Object statusObj = body.get("status");
            if (statusObj != null) {
                String status = statusObj.toString().trim();
                if (!status.equals("pending") && !status.equals("in-progress") && !status.equals("done")) {
                    return ResponseEntity.status(400).body(Map.of("message", "Invalid status value"));
                }
                task.setStatus(status);
            }
        } else {
            // Owner: allow updating any field present in the request body

            // Validate and apply title
            if (body.containsKey("title")) {
                Object titleObj = body.get("title");
                if (titleObj == null) {
                    return ResponseEntity.status(400).body(Map.of("message", "Title is required (max 200 chars)"));
                }
                String title = titleObj.toString().trim();
                if (title.isEmpty() || title.length() > 200) {
                    return ResponseEntity.status(400).body(Map.of("message", "Title is required (max 200 chars)"));
                }
                task.setTitle(title);
            }

            // Validate and apply description
            if (body.containsKey("description")) {
                Object descObj = body.get("description");
                String description = descObj != null ? descObj.toString() : "";
                if (description.length() > 2000) {
                    return ResponseEntity.status(400).body(Map.of("message", "Description must not exceed 2000 characters"));
                }
                task.setDescription(description);
            }

            // Validate and apply priority
            if (body.containsKey("priority")) {
                Object priorityObj = body.get("priority");
                if (priorityObj == null) {
                    return ResponseEntity.status(400).body(Map.of("message", "Invalid priority"));
                }
                String priority = priorityObj.toString().trim();
                if (!priority.equals("low") && !priority.equals("medium") && !priority.equals("high")) {
                    return ResponseEntity.status(400).body(Map.of("message", "Invalid priority"));
                }
                task.setPriority(priority);
            }

            // Validate and apply status
            if (body.containsKey("status")) {
                Object statusObj = body.get("status");
                if (statusObj == null) {
                    return ResponseEntity.status(400).body(Map.of("message", "Invalid status value"));
                }
                String status = statusObj.toString().trim();
                if (!status.equals("pending") && !status.equals("in-progress") && !status.equals("done")) {
                    return ResponseEntity.status(400).body(Map.of("message", "Invalid status value"));
                }
                task.setStatus(status);
            }

            // Apply dueDate
            if (body.containsKey("dueDate")) {
                Object dueDateObj = body.get("dueDate");
                if (dueDateObj == null || dueDateObj.toString().trim().isEmpty()) {
                    task.setDueDate(null);
                } else {
                    try {
                        task.setDueDate(LocalDate.parse(dueDateObj.toString().trim()));
                    } catch (DateTimeParseException e) {
                        return ResponseEntity.status(400).body(Map.of("message", "Invalid dueDate format, expected YYYY-MM-DD"));
                    }
                }
            }

            // Apply assigneeId
            if (body.containsKey("assigneeId")) {
                Object assigneeIdObj = body.get("assigneeId");
                if (assigneeIdObj == null) {
                    return ResponseEntity.status(400).body(Map.of("message", "Assignee must be a project member"));
                }
                String assigneeId = assigneeIdObj.toString();
                if (!project.getMemberIds().contains(assigneeId)) {
                    return ResponseEntity.status(400).body(Map.of("message", "Assignee must be a project member"));
                }
                task.setAssigneeId(assigneeId);
                User assignee = userRepository.getUserById(assigneeId);
                task.setAssigneeName((assignee != null && assignee.getName() != null) ? assignee.getName() : "Unknown");
            }
        }

        // Set updatedAt and persist
        task.setUpdatedAt(LocalDateTime.now());
        TodoTask saved = todoTaskRepository.saveTask(task);

        // Broadcast WebSocket event
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", "TASK_UPDATED");
        event.put("task", saved);
        messagingTemplate.convertAndSend("/topic/project/" + projectId, event);

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> deleteTask(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @CookieValue(value = "cc_token", required = false) String token) {

        // Authenticate
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        // Look up project
        Project project = projectRepository.getProjectById(projectId);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));

        // Resolve task
        TodoTask task = todoTaskRepository.getTaskById(taskId);
        if (task == null || !task.getProjectId().equals(projectId)) {
            return ResponseEntity.status(404).body(Map.of("message", "Task not found"));
        }

        // Only the task creator can delete the task
        if (!userId.equals(task.getCreatedById())) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the task creator can delete this task"));
        }

        // Delete and broadcast
        todoTaskRepository.deleteTask(taskId);

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", "TASK_DELETED");
        event.put("task", task);
        messagingTemplate.convertAndSend("/topic/project/" + projectId, event);

        return ResponseEntity.ok(Map.of("success", true, "message", "Task deleted"));
    }

    @GetMapping("/{taskId}/ics")
    public ResponseEntity<byte[]> downloadIcs(
            @PathVariable String projectId,
            @PathVariable String taskId,
            @CookieValue(value = "cc_token", required = false) String token) {

        // Authenticate
        String userId = resolveUserId(token);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        // Look up project and verify membership
        Project project = projectRepository.getProjectById(projectId);
        if (project == null) {
            return ResponseEntity.status(404).build();
        }

        if (!project.getMemberIds().contains(userId)) {
            return ResponseEntity.status(403).build();
        }

        // Look up task and verify it belongs to this project
        TodoTask task = todoTaskRepository.getTaskById(taskId);
        if (task == null || !projectId.equals(task.getProjectId())) {
            return ResponseEntity.status(404).build();
        }

        // Generate ICS content and return as file download
        String ics = generateIcs(task, project.getName());
        byte[] bytes = ics.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"task-" + taskId + ".ics\"")
                .contentType(MediaType.parseMediaType("text/calendar; charset=UTF-8"))
                .body(bytes);
    }

    private String generateIcs(TodoTask task, String projectName) {
        DateTimeFormatter stampFmt = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");
        DateTimeFormatter dateFmt  = DateTimeFormatter.ofPattern("yyyyMMdd");

        String uid     = task.getId() + "@colabconnect";
        String dtstamp = LocalDateTime.now(ZoneOffset.UTC).format(stampFmt);
        String dateStr = (task.getDueDate() != null)
                ? task.getDueDate().format(dateFmt)
                : LocalDate.now().format(dateFmt);

        String summary = escapeIcs(task.getTitle() != null ? task.getTitle() : "");
        String rawDesc = "[" + projectName + "] " + (task.getDescription() != null ? task.getDescription() : "");
        String description = escapeIcs(rawDesc);

        int priority;
        if ("high".equals(task.getPriority()))        priority = 1;
        else if ("low".equals(task.getPriority()))    priority = 9;
        else                                           priority = 5; // medium or null

        return "BEGIN:VCALENDAR\r\n" +
               "VERSION:2.0\r\n" +
               "PRODID:-//ColabConnect//TodoTask//EN\r\n" +
               "BEGIN:VEVENT\r\n" +
               "UID:" + uid + "\r\n" +
               "DTSTAMP:" + dtstamp + "\r\n" +
               "DTSTART;VALUE=DATE:" + dateStr + "\r\n" +
               "DTEND;VALUE=DATE:" + dateStr + "\r\n" +
               "SUMMARY:" + summary + "\r\n" +
               "DESCRIPTION:" + description + "\r\n" +
               "PRIORITY:" + priority + "\r\n" +
               "END:VEVENT\r\n" +
               "END:VCALENDAR\r\n";
    }

    private String escapeIcs(String text) {
        if (text == null) return "";
        return text
                .replace("\\", "\\\\")
                .replace(";",  "\\;")
                .replace(",",  "\\,")
                .replace("\n", "\\n");
    }
}
