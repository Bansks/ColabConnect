package com.colabconnect.repository;

import com.colabconnect.model.TodoTask;
import java.util.List;

public interface TodoTaskRepository {
    List<TodoTask> getTasksByProjectId(String projectId);
    TodoTask getTaskById(String taskId);
    TodoTask saveTask(TodoTask task);
    boolean deleteTask(String taskId);
}
