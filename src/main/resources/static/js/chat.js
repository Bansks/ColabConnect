let currentMode = null;   // 'dm' or 'project'
  let currentTarget = null; // userId or projectId
  let currentItemData = {};
  let stompClient = null;
  let currentSubscription = null;
  let canSendUnlimited = false;
  let guestMessageUsed = false;
  let allProjects = [];

  async function loadSidebar() {
    if (!initLayout('chat', 'Chat')) return;
    const [dmRes, projRes] = await Promise.all([
      apiFetch('/dm'),
      apiFetch('/projects?scope=mine')
    ]);
    const dms = dmRes.ok ? dmRes.data : [];
    allProjects = projRes.ok ? projRes.data : [];
    renderSidebar(dms, allProjects);

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    const dmUser = params.get('dm');
    if (dmUser) {
      selectDm(dmUser, dmUser);
    } else if (projectId && allProjects.find(p => p.id === projectId)) {
      selectProject(projectId);
    } else if (dms.length > 0) {
      selectDm(dms[0].userId, dms[0].userId);
    } else if (allProjects.length > 0) {
      selectProject(allProjects[0].id);
    }
    
    connectWebSocket();
  }

  /* WebSocket Setup */
  function connectWebSocket() {
    if (stompClient) return;
    const socket = new SockJS('/cc/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    stompClient.connect({}, function (frame) {
      console.log('STOMP Connected!');
      if (currentTarget) subscribeToCurrent();
    });
  }
  
  function subscribeToCurrent() {
    if (!stompClient || !stompClient.connected) {
       setTimeout(subscribeToCurrent, 300);
       return;
    }
    if (currentMode === 'dm') {
      const mId = Session.getUserId();
      const minId = mId < currentTarget ? mId : currentTarget;
      const maxId = mId > currentTarget ? mId : currentTarget;
      currentSubscription = stompClient.subscribe(`/topic/dm/${minId}_${maxId}`, function (msg) {
        if (currentMode === 'dm' && currentTarget) fetchDm(currentTarget, true);
      });
    } else if (currentMode === 'project') {
      currentSubscription = stompClient.subscribe(`/topic/project/${currentTarget}`, function (msg) {
        try {
          const event = JSON.parse(msg.body);
          if (event && (event.type === 'TASK_CREATED' || event.type === 'TASK_UPDATED' || event.type === 'TASK_DELETED')) {
            if (document.getElementById('chat-tasks-panel').style.display !== 'none') {
              fetchProjectTasks(currentTarget);
            }
            return;
          }
        } catch (e) {}
        if (currentMode === 'project' && currentTarget) fetchProject(currentTarget, true);
      });
    }
  }

  function renderSidebar(dms, projects) {
    const myId = Session.getUserId();
    let html = '';

    html += `<div class="chat-section-label">Direct Messages</div>`;
    if (dms.length === 0) {
      html += `<div style="padding:8px 16px;font-size:12px;color:var(--text-muted)">No conversations yet. <a href="/discover.html">Find people</a></div>`;
    } else {
      html += dms.map(d => `
        <div class="chat-item" id="dm-item-${d.userId}" onclick="selectDm('${d.userId}', '${d.userId}')">
          <div class="chat-item-icon">${getInitials(d.name)}</div>
          <div class="chat-item-info">
            <div class="chat-item-name">${d.name}</div>
            <div class="chat-item-preview">${d.lastMessage ? (d.lastMessageIsOwn ? 'You: ' : '') + d.lastMessage.substring(0, 35) + (d.lastMessage.length > 35 ? '…' : '') : d.title || ''}</div>
          </div>
          ${d.connected ? '' : '<div title="Not connected" style="width:8px;height:8px;border-radius:50%;background:#ffc107;flex-shrink:0"></div>'}
        </div>`).join('');
    }

    html += `<div class="chat-section-label" style="margin-top:8px">Project Chats</div>`;
    if (projects.length === 0) {
      html += `<div style="padding:8px 16px;font-size:12px;color:var(--text-muted)">No projects. <a href="/projects.html">Create one</a></div>`;
    } else {
      html += projects.map(p => `
        <div class="chat-item" id="proj-item-${p.id}" onclick="selectProject('${p.id}')">
          <div class="chat-item-icon project"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div>
          <div class="chat-item-info">
            <div class="chat-item-name">${p.name}</div>
            <div class="chat-item-preview">${p.type} · ${p.memberCount} member${p.memberCount !== 1 ? 's' : ''}</div>
          </div>
        </div>`).join('');
    }

    document.getElementById('chat-list').innerHTML = html;
  }

  function setActiveItem(mode, id) {
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById((mode === 'dm' ? 'dm-item-' : 'proj-item-') + id);
    if (el) el.classList.add('active');
  }

  /* ── DM ── */
  async function selectDm(userId, _) {
    hideTasksPanel();
    if (currentSubscription) currentSubscription.unsubscribe();
    currentMode = 'dm';
    currentTarget = userId;
    setActiveItem('dm', userId);
    renderChatLoading();
    await fetchDm(userId);
    subscribeToCurrent();
  }

  async function fetchDm(userId, isPoll = false) {
    const { ok, data } = await apiFetch(`/dm/${userId}`);
    if (!ok || currentMode !== 'dm' || currentTarget !== userId) return;
    canSendUnlimited = data.canSendUnlimited;
    guestMessageUsed = data.guestMessageUsed;
    currentItemData = data;
    if (!isPoll) renderDmChat(data);
    else updateMessages(data.messages, 'dm');
  }

  function renderDmChat(data) {
    const connected = data.connected;
    const badge = connected
      ? `<span class="badge badge-available" style="font-size:11px">Connected</span>`
      : `<span class="badge" style="background:#fff3cd;color:#856404;font-size:11px"><box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Not Connected</span>`;
    document.getElementById('chat-main').innerHTML = `
      <div class="chat-header">
        <div class="chat-header-icon">${getInitials(data.partnerName)}</div>
        <div><div class="chat-header-name">${data.partnerName}</div><div class="chat-header-sub">${data.partnerTitle || ''}</div></div>
        <div class="chat-header-badge">${badge}</div>
      </div>
      <div class="chat-messages" id="messages-container"></div>
      <div class="chat-footer" id="chat-footer"></div>`;
    updateMessages(data.messages, 'dm');
    renderFooter('dm');
  }

  /* ── Project ── */
  async function selectProject(projectId) {
    hideTasksPanel();
    if (currentSubscription) currentSubscription.unsubscribe();
    currentMode = 'project';
    currentTarget = projectId;
    setActiveItem('project', projectId);
    renderChatLoading();
    await fetchProject(projectId);
    subscribeToCurrent();
  }

  async function fetchProject(projectId, isPoll = false) {
    const { ok, data } = await apiFetch(`/chat/${projectId}`);
    if (!ok || currentMode !== 'project' || currentTarget !== projectId) return;
    canSendUnlimited = data.canSendUnlimited;
    guestMessageUsed = data.guestMessageUsed;
    currentItemData = data;
    if (!isPoll) renderProjectChat(data);
    else updateMessages(data.messages, 'project');
  }

  function renderProjectChat(data) {
    const project = allProjects.find(p => p.id === currentTarget) || {};
    const badge = data.isMember
      ? `<span class="badge badge-available" style="font-size:11px">Member</span>`
      : data.canSendUnlimited
        ? `<span class="badge" style="background:#e8f5e9;color:#2e7d32;font-size:11px">Connected</span>`
        : `<span class="badge" style="background:#f3f0ff;color:var(--teams-purple);font-size:11px">Guest</span>`;
    
    const tasksBtn = data.isMember
      ? `<button class="btn btn-secondary btn-sm" onclick="toggleTasksPanel()"><box-icon name="list-check" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></box-icon> Tasks</button>`
      : '';

    document.getElementById('chat-main').innerHTML = `
      <div class="chat-header">
        <div class="chat-header-icon project"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div>
        <div><div class="chat-header-name" style="cursor:pointer" onclick="openProjectDetail('${currentTarget}')">${data.projectName}</div><div class="chat-header-sub">${project.memberCount || 0} members · ${project.type || ''}</div></div>
        <div class="chat-header-badge" style="display:flex; align-items:center; gap:8px;">${badge}${tasksBtn}</div>
      </div>
      <div class="chat-messages" id="messages-container"></div>
      <div class="chat-footer" id="chat-footer"></div>`;
    updateMessages(data.messages, 'project');
    renderFooter('project');

    if (data.isMember) {
      fetchProjectTasks(currentTarget);
    }
  }

  /* ── Shared rendering ── */
  function renderChatLoading() {
    document.getElementById('chat-main').innerHTML = `
      <div class="chat-header"><div class="chat-header-icon">…</div><div><div class="chat-header-name">Loading…</div></div></div>
      <div class="chat-messages"><div class="loading"><div class="spinner"></div></div></div>
      <div class="chat-footer"></div>`;
  }

  function updateMessages(messages, mode) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;
    const myId = Session.getUserId();
    let lastDate = null; let html = '';
    if (!messages || messages.length === 0) {
      html = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:8px"><box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div><div>No messages yet. Say hello!</div></div>`;
    } else {
      messages.forEach(msg => {
        const d = new Date(msg.timestamp);
        const dateStr = d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
        if (dateStr !== lastDate) { html += `<div class="date-divider">${dateStr}</div>`; lastDate = dateStr; }
        const isOwn = msg.isOwn !== undefined ? msg.isOwn : msg.fromUserId === myId || msg.senderId === myId;
        const name = msg.senderName || (isOwn ? 'You' : 'Unknown');
        const time = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
        html += `<div class="msg-group ${isOwn ? 'own' : ''}">
          <div class="msg-avatar">${getInitials(name)}</div>
          <div class="msg-body">
            <div class="msg-meta"><span class="msg-sender">${name}</span><span class="msg-time">${time}</span></div>
            <div class="msg-bubble">${escapeHtml(msg.content)}</div>
          </div></div>`;
      });
    }
    container.innerHTML = html;
    if (atBottom) container.scrollTop = container.scrollHeight;
  }

  function renderFooter(mode) {
    const footer = document.getElementById('chat-footer');
    if (!footer) return;

    if (!canSendUnlimited && guestMessageUsed) {
      const linkLabel = mode === 'dm' ? 'a shared project connection' : 'a project member connection';
      const linkHref = mode === 'dm' ? '/connections.html' : '/projects.html';
      footer.innerHTML = `<div class="guest-blocked"><box-icon name="lock" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> You've used your 1 introductory message. Get a <a href="${linkHref}">${linkLabel}</a> to chat freely.</div>`;
      return;
    }

    const warn = !canSendUnlimited && !guestMessageUsed
      ? `<div class="guest-warning"><span style="font-size:16px"><box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></span>
          <div>You can send <strong>1 message</strong> before being connected.
          ${mode === 'dm' ? '<a href="/projects.html" style="color:#856404;font-weight:700">Join a shared project</a> to chat freely.' : '<a href="/projects.html" style="color:#856404;font-weight:700">Join this project</a> to chat freely.'}</div>
        </div>` : '';

    const isProjectMember = mode === 'project';
    
    const plusButtonHtml = isProjectMember
      ? `<button class="chat-add-task-btn" onclick="toggleTaskPopover(event)" title="Create Task" style="width:42px; height:42px; background:var(--bg-secondary); border:1.5px solid var(--border); border-radius:8px; cursor:pointer; font-size:24px; font-weight:600; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-primary); transition:background .15s, border-color .15s; outline:none;">
           +
         </button>`
      : '';

    const popoverHtml = isProjectMember
      ? `<div class="task-popover" id="task-popover" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:2000; width:450px; background:var(--surface); border:1.5px solid var(--border); border-radius:16px; padding:24px; box-shadow:0 10px 40px rgba(0,0,0,0.25); flex-direction:column; gap:16px;" onclick="event.stopPropagation()">
           <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
             <div style="font-size:14px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
               <box-icon name="list-check" color="var(--teams-purple)" style="width:20px; height:20px; vertical-align:middle;"></box-icon> Create Project Task
             </div>
             <button class="btn-icon" onclick="toggleTaskPopover(event)" style="background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px; border-radius:50%; transition:background 0.15s;">
               <box-icon name="x" color="currentColor" style="width:18px; height:18px;"></box-icon>
             </button>
           </div>
           
           <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
             <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Task Title *</label>
             <input type="text" id="popover-task-title" placeholder="What needs to be done?" style="width:100%; border:1.5px solid var(--border); border-radius:8px; padding:8px 12px; font-size:13px; background:var(--bg-primary); color:var(--text-primary); outline:none; transition:border-color 0.15s;" onkeydown="handlePopoverTaskKey(event)">
           </div>
           
           <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
             <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Assignee *</label>
             <select id="popover-task-assignee" style="width:100%; border:1.5px solid var(--border); border-radius:8px; padding:8px 12px; font-size:13px; background:var(--bg-primary); color:var(--text-primary); outline:none; transition:border-color 0.15s;">
               <option value="">Choose team member...</option>
             </select>
           </div>
           
           <div style="display:flex; gap:16px;">
             <div class="form-group" style="flex:1; display:flex; flex-direction:column; gap:6px;">
               <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Priority</label>
               <select id="popover-task-priority" style="width:100%; border:1.5px solid var(--border); border-radius:8px; padding:8px 12px; font-size:13px; background:var(--bg-primary); color:var(--text-primary); outline:none; transition:border-color 0.15s;">
                 <option value="low">Low</option>
                 <option value="medium" selected>Medium</option>
                 <option value="high">High</option>
               </select>
             </div>
             
             <div class="form-group" style="flex:1.2; display:flex; flex-direction:column; gap:6px;">
               <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Due Date</label>
               <input type="date" id="popover-task-duedate" style="width:100%; border:1.5px solid var(--border); border-radius:8px; padding:7px 12px; font-size:13px; background:var(--bg-primary); color:var(--text-primary); outline:none; font-family:inherit; transition:border-color 0.15s;">
             </div>
           </div>
           
           <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:8px;">
             <button class="btn btn-secondary" onclick="toggleTaskPopover(event)" style="padding:8px 16px; font-size:13px; border-radius:8px;">Cancel</button>
             <button class="btn btn-primary" onclick="createPopoverTask()" style="padding:8px 20px; font-size:13px; border-radius:8px; font-weight:600;">Create Task</button>
           </div>
         </div>`
      : '';

    footer.style.position = 'relative';

    footer.innerHTML = `${warn}
      ${popoverHtml}
      <div class="chat-input-row" style="display:flex; gap:10px; align-items:flex-end;">
        ${plusButtonHtml}
        <textarea class="chat-input" id="msg-input" placeholder="Type a message… (Enter to send)" rows="1"
          onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
        <button class="chat-send-btn" id="send-btn" onclick="sendMessage()"><box-icon name="right-arrow-alt" animation="fade-right-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></button>
      </div>`;
    document.getElementById('msg-input')?.focus();
  }

  async function sendMessage() {
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    if (!input || !currentTarget) return;
    const content = input.value.trim();
    if (!content) return;
    input.disabled = true; sendBtn.disabled = true;

    const endpoint = currentMode === 'dm' ? `/dm/${currentTarget}` : `/chat/${currentTarget}`;
    const { ok, data } = await apiFetch(endpoint, { method:'POST', body:JSON.stringify({ content }) });

    if (ok && data.success) {
      input.value = ''; input.style.height = '';
      canSendUnlimited = data.canSendUnlimited ?? canSendUnlimited;
      guestMessageUsed = data.guestMessageUsed ?? guestMessageUsed;
      if (currentMode === 'dm') await fetchDm(currentTarget, true);
      else await fetchProject(currentTarget, true);
      renderFooter(currentMode);
    } else {
      Toast.show(data.message || 'Failed to send', 'error');
    }
    input.disabled = false; sendBtn.disabled = false;
    input?.focus();
  }

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  window.addEventListener('beforeunload', () => { if (stompClient) stompClient.disconnect(); });

  /* ── To-Do Task Management & iCalendar Integration ── */
  let currentProjectDetails = null;
  let currentTasks = [];

  function toggleTasksPanel() {
    const panel = document.getElementById('chat-tasks-panel');
    if (!panel) return;
    if (panel.style.display === 'none') {
      panel.style.display = 'flex';
      fetchProjectTasks(currentTarget);
    } else {
      panel.style.display = 'none';
    }
  }

  function hideTasksPanel() {
    const panel = document.getElementById('chat-tasks-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  async function fetchProjectTasks(projectId) {
    if (!projectId) return;
    const [tasksRes, projRes] = await Promise.all([
      apiFetch('/projects/' + projectId + '/todos'),
      apiFetch('/projects/' + projectId)
    ]);
    if (tasksRes.ok && projRes.ok) {
      currentProjectDetails = projRes.data;
      currentTasks = tasksRes.data;
      renderTasks(tasksRes.data);
    } else {
      console.error("Failed to fetch tasks or project details", tasksRes, projRes);
    }
  }

  function renderTasks(tasks) {
    const pendingContainer = document.getElementById('tasks-list-pending');
    const inprogressContainer = document.getElementById('tasks-list-inprogress');
    const doneContainer = document.getElementById('tasks-list-done');

    if (pendingContainer) pendingContainer.innerHTML = '';
    if (inprogressContainer) inprogressContainer.innerHTML = '';
    if (doneContainer) doneContainer.innerHTML = '';

    let pendingHtml = '';
    let inprogressHtml = '';
    let doneHtml = '';

    const myId = Session.getUserId();
    const isOwner = currentProjectDetails ? currentProjectDetails.isOwner : false;

    tasks.forEach(task => {
      const isCompleted = task.status === 'done';
      const isCreator = task.createdById === myId;
      const canModifyStatus = isOwner || task.assigneeId === myId || isCreator;

      const cardHtml = `
        <div class="task-card" id="task-${task.id}">
          <div class="task-card-top">
            <input type="checkbox" class="task-checkbox" 
                   ${isCompleted ? 'checked' : ''} 
                   ${canModifyStatus ? '' : 'disabled'}
                   onclick="toggleTaskCompletion('${task.id}', this.checked)">
            <span class="task-title ${isCompleted ? 'completed' : ''}">${escapeHtml(task.title)}</span>
          </div>
          
          ${task.description ? `<div style="font-size:11px; color:var(--text-muted); padding-left:24px; word-break:break-word; margin-top:2px;">${escapeHtml(task.description)}</div>` : ''}
          
          <div class="task-meta" style="padding-left:24px; margin-top:4px;">
            <span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span>
            ${task.dueDate ? `<span class="task-due"><box-icon name="calendar" color="currentColor" style="width:12px; height:12px; vertical-align:middle;"></box-icon> ${task.dueDate}</span>` : ''}
            <span class="task-assignee"><box-icon name="user" color="currentColor" style="width:12px; height:12px; vertical-align:middle;"></box-icon> ${escapeHtml(task.assigneeName)}</span>
          </div>
          
          <div class="task-actions" style="margin-top:8px; padding-top:4px;">
            ${canModifyStatus && !isCompleted ? `
              <button class="btn btn-secondary btn-xs" onclick="toggleTaskInProgress('${task.id}', '${task.status}')" style="font-size:10px; padding:2px 6px;">
                ${task.status === 'in-progress' ? 'Mark Pending' : 'Mark In Progress'}
              </button>
            ` : ''}
            
            <button class="btn btn-icon btn-xs" title="Add to Google Calendar" onclick="addToGoogleCalendar('${task.id}')" style="padding:2px; display:inline-flex; align-items:center; margin-right:4px;">
              <box-icon type="logo" name="google" color="currentColor" style="width:14px; height:14px;"></box-icon>
            </button>

            <button class="btn btn-icon btn-xs" title="Download Calendar Invite (.ics)" onclick="downloadTaskIcs('${task.id}')" style="padding:2px; display:inline-flex; align-items:center;">
              <box-icon name="calendar-plus" color="currentColor" style="width:14px; height:14px;"></box-icon>
            </button>
            
            ${isCreator ? `
              <button class="btn btn-icon btn-xs" title="Delete Task" onclick="deleteProjectTask('${task.id}')" style="padding:2px; display:inline-flex; align-items:center;">
                <box-icon name="trash" color="var(--danger)" style="width:14px; height:14px;"></box-icon>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      if (task.status === 'done') {
        doneHtml += cardHtml;
      } else if (task.status === 'in-progress') {
        inprogressHtml += cardHtml;
      } else {
        pendingHtml += cardHtml;
      }
    });

    if (pendingContainer) {
      pendingContainer.innerHTML = pendingHtml || '<div style="font-size:11px; color:var(--text-muted); padding:8px 0; text-align:center;">No pending tasks</div>';
    }
    if (inprogressContainer) {
      inprogressContainer.innerHTML = inprogressHtml || '<div style="font-size:11px; color:var(--text-muted); padding:8px 0; text-align:center;">No tasks in progress</div>';
    }
    if (doneContainer) {
      doneContainer.innerHTML = doneHtml || '<div style="font-size:11px; color:var(--text-muted); padding:8px 0; text-align:center;">No completed tasks</div>';
    }
  }

  async function updateTaskStatus(taskId, newStatus) {
    const { ok, data } = await apiFetch('/projects/' + currentTarget + '/todos/' + taskId, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    if (ok) {
      fetchProjectTasks(currentTarget);
    } else {
      Toast.show(data.message || 'Failed to update task status', 'error');
    }
  }

  function toggleTaskCompletion(taskId, isChecked) {
    const newStatus = isChecked ? 'done' : 'pending';
    updateTaskStatus(taskId, newStatus);
  }

  function toggleTaskInProgress(taskId, currentStatus) {
    const newStatus = currentStatus === 'in-progress' ? 'pending' : 'in-progress';
    updateTaskStatus(taskId, newStatus);
  }

  async function deleteProjectTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const { ok, data } = await apiFetch('/projects/' + currentTarget + '/todos/' + taskId, {
      method: 'DELETE'
    });
    if (ok) {
      Toast.show('Task deleted successfully', 'success');
      fetchProjectTasks(currentTarget);
    } else {
      Toast.show(data.message || 'Failed to delete task', 'error');
    }
  }

  function openCreateTaskModal() {
    const modal = document.getElementById('create-task-modal');
    if (!modal) return;

    document.getElementById('task-title-input').value = '';
    document.getElementById('task-desc-input').value = '';
    document.getElementById('task-duedate-input').value = '';
    document.getElementById('task-priority-select').value = 'medium';

    const errorEl = document.getElementById('create-task-error');
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.innerText = '';
    }

    const select = document.getElementById('task-assignee-select');
    if (select) {
      select.innerHTML = '<option value="">Choose team member...</option>';
      if (currentProjectDetails && currentProjectDetails.members) {
        currentProjectDetails.members.forEach(m => {
          select.innerHTML += `<option value="${m.id}">${escapeHtml(m.name)}</option>`;
        });
      }
    }

    openModal('create-task-modal');
  }

  async function createProjectTask() {
    const titleInput = document.getElementById('task-title-input');
    const descInput = document.getElementById('task-desc-input');
    const assigneeSelect = document.getElementById('task-assignee-select');
    const prioritySelect = document.getElementById('task-priority-select');
    const dueDateInput = document.getElementById('task-duedate-input');
    const errorEl = document.getElementById('create-task-error');

    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.innerText = '';
    }

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const assigneeId = assigneeSelect.value;
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value;

    if (!title) {
      showError('Task title is required');
      return;
    }
    if (!assigneeId) {
      showError('Assignee is required');
      return;
    }

    const payload = {
      title,
      description,
      assigneeId,
      priority,
      dueDate: dueDate || null
    };

    const createBtn = document.getElementById('task-create-confirm-btn');
    if (createBtn) createBtn.disabled = true;

    const { ok, data } = await apiFetch('/projects/' + currentTarget + '/todos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (createBtn) createBtn.disabled = false;

    if (ok) {
      closeModal('create-task-modal');
      Toast.show('Task created successfully', 'success');
      fetchProjectTasks(currentTarget);
    } else {
      showError(data.message || 'Failed to create task');
    }

    function showError(msg) {
      if (errorEl) {
        errorEl.innerText = msg;
        errorEl.style.display = 'block';
      } else {
        Toast.show(msg, 'error');
      }
    }
  }

  function downloadTaskIcs(taskId) {
    if (!currentTarget || !taskId) return;
    const url = '/cc/projects/' + currentTarget + '/todos/' + taskId + '/ics';
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task-' + taskId + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function addToGoogleCalendar(taskId) {
    if (!currentTasks || !taskId) return;
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;

    const title = encodeURIComponent(task.title);
    const desc = encodeURIComponent(`[${currentProjectDetails.name}] ${task.description || ''}`);
    
    let dateStr = '';
    if (task.dueDate) {
      const baseDate = task.dueDate.replace(/-/g, '');
      const parts = task.dueDate.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + 1);
      
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const nextDate = `${y}${m}${day}`;
      
      dateStr = `${baseDate}/${nextDate}`;
    } else {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const baseDate = `${y}${m}${day}`;
      
      today.setDate(today.getDate() + 1);
      const yNext = today.getFullYear();
      const mNext = String(today.getMonth() + 1).padStart(2, '0');
      const dayNext = String(today.getDate()).padStart(2, '0');
      const nextDate = `${yNext}${mNext}${dayNext}`;
      
      dateStr = `${baseDate}/${nextDate}`;
    }

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}&details=${desc}`;
    window.open(url, '_blank');
  }

  async function createPopoverTask() {
    const titleInput = document.getElementById('popover-task-title');
    const assigneeSelect = document.getElementById('popover-task-assignee');
    const prioritySelect = document.getElementById('popover-task-priority');
    const dueDateInput = document.getElementById('popover-task-duedate');
    
    if (!titleInput) return;
    const title = titleInput.value.trim();
    const assigneeId = assigneeSelect ? assigneeSelect.value : '';
    const priority = prioritySelect ? prioritySelect.value : 'medium';
    const dueDate = dueDateInput ? dueDateInput.value : '';

    if (!title) {
      Toast.show('Task title is required', 'error');
      titleInput.focus();
      return;
    }
    if (!assigneeId) {
      Toast.show('Assignee is required', 'error');
      if (assigneeSelect) assigneeSelect.focus();
      return;
    }

    const payload = {
      title,
      description: '',
      assigneeId,
      priority,
      dueDate: dueDate || null
    };

    const addBtn = document.querySelector('#task-popover button.btn-primary');
    if (addBtn) addBtn.disabled = true;

    const { ok, data } = await apiFetch('/projects/' + currentTarget + '/todos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (addBtn) addBtn.disabled = false;

    if (ok) {
      titleInput.value = '';
      if (dueDateInput) dueDateInput.value = '';
      const popover = document.getElementById('task-popover');
      if (popover) popover.style.display = 'none';
      Toast.show('Task created successfully', 'success');
      fetchProjectTasks(currentTarget);
    } else {
      Toast.show(data.message || 'Failed to create task', 'error');
    }
  }

  function handlePopoverTaskKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      createPopoverTask();
    }
  }

  function toggleTaskPopover(event) {
    if (event) event.stopPropagation();
    const popover = document.getElementById('task-popover');
    if (!popover) return;
    if (popover.style.display === 'none' || popover.style.display === '') {
      popover.style.display = 'flex';
      populatePopoverAssignees();
      const titleInput = document.getElementById('popover-task-title');
      if (titleInput) titleInput.focus();
    } else {
      popover.style.display = 'none';
    }
  }

  function populatePopoverAssignees() {
    const select = document.getElementById('popover-task-assignee');
    if (select && currentProjectDetails && currentProjectDetails.members) {
      const val = select.value;
      select.innerHTML = '<option value="">Assignee...</option>';
      currentProjectDetails.members.forEach(m => {
        select.innerHTML += `<option value="${m.id}" ${m.id === val ? 'selected' : ''}>${escapeHtml(m.name)}</option>`;
      });
    }
  }

  document.addEventListener('click', function(event) {
    const popover = document.getElementById('task-popover');
    if (!popover) return;
    const isClickInside = popover.contains(event.target) || event.target.closest('.chat-add-task-btn');
    if (!isClickInside) {
      popover.style.display = 'none';
    }
  });

  loadSidebar();