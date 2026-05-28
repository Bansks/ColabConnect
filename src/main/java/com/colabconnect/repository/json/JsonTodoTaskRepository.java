package com.colabconnect.repository.json;

import com.colabconnect.model.TodoTask;
import com.colabconnect.repository.TodoTaskRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class JsonTodoTaskRepository extends JsonBaseRepository implements TodoTaskRepository {

    private final Map<String, TodoTask> tasks;
    private static final File FILE = new File("data/todos.json");

    public JsonTodoTaskRepository() {
        super();
        this.tasks = loadMap(FILE, new TypeReference<ConcurrentHashMap<String, TodoTask>>() {});
    }

    /**
     * Writes the full in-memory map to disk.
     * Throws IOException on failure so callers can roll back.
     */
    private void persist() throws IOException {
        FILE.getParentFile().mkdirs();
        mapper.writeValue(FILE, tasks);
    }

    @Override
    public List<TodoTask> getTasksByProjectId(String projectId) {
        return tasks.values().stream()
                .filter(t -> projectId.equals(t.getProjectId()))
                .sorted(Comparator.comparing(
                        TodoTask::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    @Override
    public TodoTask getTaskById(String taskId) {
        return tasks.get(taskId);
    }

    @Override
    public TodoTask saveTask(TodoTask task) {
        boolean isNew = (task.getId() == null || task.getId().isEmpty());
        if (isNew) {
            task.setId(UUID.randomUUID().toString());
        }

        String id = task.getId();
        TodoTask previous = tasks.get(id);   // null for new tasks

        tasks.put(id, task);

        try {
            persist();
        } catch (IOException e) {
            // Roll back in-memory change
            if (isNew) {
                tasks.remove(id);
            } else if (previous != null) {
                tasks.put(id, previous);
            } else {
                tasks.remove(id);
            }
            e.printStackTrace();
            throw new RuntimeException("Failed to persist task to disk; change rolled back.", e);
        }

        return task;
    }

    @Override
    public boolean deleteTask(String taskId) {
        TodoTask removed = tasks.remove(taskId);
        if (removed == null) {
            return false;
        }

        try {
            persist();
        } catch (IOException e) {
            // Roll back in-memory change
            tasks.put(taskId, removed);
            e.printStackTrace();
            throw new RuntimeException("Failed to persist deletion to disk; change rolled back.", e);
        }

        return true;
    }
}
