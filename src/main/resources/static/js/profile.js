let viewedUserId = null;
  let isOwnProfile = false;
  let profileData = null;

  async function loadProfile() {
    if (!initLayout('profile', 'Profile')) return;

    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id');
    const myId = Session.getUserId();
    isOwnProfile = !targetId || targetId === myId;
    viewedUserId = targetId || myId;

    document.getElementById('page-title-text').textContent = isOwnProfile ? 'My Profile' : 'Profile';

    const { ok, data } = await apiFetch(`/users/${viewedUserId}`);
    if (!ok) {
      document.getElementById('profile-content').innerHTML = `<div class="empty-state"><div class="empty-icon"><box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div><div>User not found</div></div>`;
      return;
    }
    profileData = data;

    // Set up actions
    const actionsEl = document.getElementById('profile-actions');
    if (isOwnProfile) {
      actionsEl.innerHTML = `<button class="btn btn-primary" onclick="openEditModal()"><box-icon name="pencil" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon>️ Edit Profile</button>`;
    } else {
      actionsEl.innerHTML = `<a href="/projects.html?browse=all" class="btn btn-primary"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Request to Join a Project</a>`;
    }

    renderProfile(data);
  }
  function renderProfile(u) {
    const avClass = u.availability === 'available' ? 'available' : u.availability === 'weekends' ? 'weekends' : 'limited';
    const avLabel = availabilityLabel(u.availability);
    const workStyleLabels = { 'async-friendly': '<box-icon name="globe" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Async-Friendly', 'collaborative': '<box-icon name="network-chart" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Collaborative', 'structured': '<box-icon name="clipboard" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Structured', 'flexible': '<box-icon name="bolt" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Flexible' };

    document.getElementById('profile-content').innerHTML = `
      <div style="width:100%">
        <!-- Hero Banner -->
        <div class="profile-hero" style="margin-bottom: 24px;">
          <div class="profile-info" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:20px; width:100%">
            <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
              <div class="user-avatar user-avatar-xl" style="background: linear-gradient(135deg, var(--brand-blue), var(--brand-blue-dark)); color: white; box-shadow: var(--shadow-sm);">${getInitials(u.name)}</div>
              <div class="profile-meta">
                <div class="profile-name" style="font-size: 24px; font-weight: 700; color: white;">${u.name}</div>
                <div class="profile-title-text" style="font-size: 15px; opacity: 0.9; color: white; margin-top: 4px;">${u.title || 'Developer'}</div>
                <div style="display:flex;align-items:center;gap:12px;margin-top:10px;font-size:13px;">
                  <span style="background:rgba(255,255,255,0.15); padding:4px 10px; border-radius:12px; color:white; display:inline-flex; align-items:center; gap:6px;">
                    <span class="availability-dot ${avClass}" style="margin:0"></span>${avLabel}
                  </span>
                  ${u.workStyle ? `<span style="background:rgba(255,255,255,0.15); padding:4px 10px; border-radius:12px; color:white; display:inline-flex; align-items:center; gap:6px;">${workStyleLabels[u.workStyle] || u.workStyle}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="profile-stats-row" style="display:flex; gap:16px; margin:0; flex-wrap:wrap;">
              ${u.reliabilityScore > 0 ? `<div class="profile-stat" style="background:rgba(255,255,255,0.15); padding:12px 18px; border-radius:var(--radius-lg); min-width:90px; text-align:center;"><div class="profile-stat-value" style="font-size:20px; font-weight:700; color:white;">${u.reliabilityScore}%</div><div class="profile-stat-label" style="font-size:11px; opacity:0.8; color:white; margin-top:2px;">Reliability</div></div>` : ''}
              <div class="profile-stat" style="background:rgba(255,255,255,0.15); padding:12px 18px; border-radius:var(--radius-lg); min-width:90px; text-align:center;"><div class="profile-stat-value" style="font-size:20px; font-weight:700; color:white;">${u.collaborations || 0}</div><div class="profile-stat-label" style="font-size:11px; opacity:0.8; color:white; margin-top:2px;">Collaborations</div></div>
              ${u.avgRating > 0 ? `<div class="profile-stat" style="background:rgba(255,255,255,0.15); padding:12px 18px; border-radius:var(--radius-lg); min-width:90px; text-align:center;"><div class="profile-stat-value" style="font-size:20px; font-weight:700; color:white;">${u.avgRating.toFixed(1)} ★</div><div class="profile-stat-label" style="font-size:11px; opacity:0.8; color:white; margin-top:2px;">Rating</div></div>` : ''}
            </div>
          </div>
        </div>

        <!-- 2-Column Responsive Dashboard -->
        <div class="profile-dashboard-grid">
          <!-- Left Column (Primary Info) -->
          <div style="display:flex; flex-direction:column; gap:24px;">
            <!-- About Card -->
            <div class="card" style="display:flex; flex-direction:column; gap:16px;">
              <div class="card-title" style="font-size:15px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px;">
                <box-icon name="user" color="var(--brand-blue)" style="width:20px; height:20px; vertical-align:middle;"></box-icon> About Me
              </div>
              <p style="line-height:1.7; color:var(--text-secondary); font-size:14px; white-space:pre-line;">${u.bio || 'This collaborator has not completed their bio yet.'}</p>
            </div>

            <!-- Peer Ratings & Reviews Card -->
            ${u.ratingCount > 0 ? `
            <div class="card" style="display:flex; flex-direction:column; gap:16px;">
              <div class="card-title" style="font-size:15px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px;">
                <box-icon name="star" type="solid" color="var(--brand-blue)" style="width:20px; height:20px; vertical-align:middle;"></box-icon> Peer Ratings & Reviews
              </div>
              
              <div style="display:flex; align-items:center; gap:24px; background:var(--surface-alt); padding:16px 20px; border-radius:var(--radius-lg); flex-wrap:wrap; border:1px solid var(--border);">
                <div style="font-size:36px; font-weight:800; color:var(--brand-blue); display:flex; align-items:center; gap:4px;">${u.avgRating.toFixed(1)} <span style="font-size:20px; color:var(--text-muted); font-weight:500;">/ 5.0</span></div>
                <div style="height:40px; width:1px; background:var(--border); display:inline-block;" class="hide-mobile"></div>
                <div>
                  <div style="display:flex; align-items:center; gap:2px; margin-bottom:4px;">
                    ${'<box-icon name="star" type="solid" color="#f59e0b" style="width:18px; height:18px;"></box-icon>'.repeat(Math.round(u.avgRating))}
                    ${'<box-icon name="star" color="var(--text-muted)" style="width:18px; height:18px;"></box-icon>'.repeat(5-Math.round(u.avgRating))}
                  </div>
                  <div class="text-sm text-muted">Based on ${u.ratingCount} project rating${u.ratingCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
              
              ${(u.endorsements||[]).length ? `
                <div style="font-size:13px; font-weight:700; color:var(--text); margin-top:8px; margin-bottom:4px;">Recent Collaborations Feed</div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  ${u.endorsements.map(e => `
                    <div style="background:var(--surface-alt); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; display:flex; flex-direction:column; gap:8px; box-shadow:var(--shadow-sm);">
                      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                          <div class="user-avatar" style="width:28px; height:28px; font-size:11px; display:flex; align-items:center; justify-content:center;">${getInitials(e.fromName)}</div>
                          <span style="font-weight:600; font-size:13px; color:var(--text);">${e.fromName}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:2px;">
                          ${'<box-icon name="star" type="solid" color="#f59e0b" style="width:14px; height:14px;"></box-icon>'.repeat(e.stars)}
                        </div>
                      </div>
                      <div style="font-size:13px; color:var(--text-secondary); font-style:italic; line-height:1.5;">"${escapeHtml(e.note)}"</div>
                      <div style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:4px; margin-top:2px;">
                        <box-icon name="folder" color="currentColor" style="width:12px; height:12px; vertical-align:middle;"></box-icon> via ${e.projectName}
                      </div>
                    </div>`).join('')}
                </div>` : ''}
            </div>` : ''}
          </div>

          <!-- Right Column (Sidebar Info) -->
          <div style="display:flex; flex-direction:column; gap:24px;">
            <!-- Skills Inventory Card -->
            <div class="card" style="display:flex; flex-direction:column; gap:16px;">
              <div class="card-title" style="font-size:13px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
                <box-icon name="code-alt" color="var(--brand-blue)" style="width:18px; height:18px; vertical-align:middle;"></box-icon> Skills Inventory
              </div>
              ${u.skills?.length 
                ? `<div class="tags" style="display:flex; flex-wrap:wrap; gap:6px;">${u.skills.map(s => `<span class="tag" style="padding:4px 10px; font-size:12px;">${s}</span>`).join('')}</div>`
                : `<div class="text-muted text-sm" style="font-style:italic;">No skills listed.</div>`
              }
            </div>

            <!-- Project Interests Card -->
            <div class="card" style="display:flex; flex-direction:column; gap:16px;">
              <div class="card-title" style="font-size:13px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
                <box-icon name="briefcase" color="var(--brand-blue)" style="width:18px; height:18px; vertical-align:middle;"></box-icon> Project Interests
              </div>
              ${u.projectTypes?.length 
                ? `<div class="tags" style="display:flex; flex-wrap:wrap; gap:6px;">${u.projectTypes.map(t => `<span class="tag tag-muted" style="padding:4px 10px; font-size:12px;">${t}</span>`).join('')}</div>`
                : `<div class="text-muted text-sm" style="font-style:italic;">Not specified.</div>`
              }
            </div>

            <!-- Performance Meter (Only if reliability > 0) -->
            ${u.reliabilityScore > 0 ? `
            <div class="card" style="display:flex; flex-direction:column; gap:12px;">
              <div class="card-title" style="font-size:13px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
                <box-icon name="analyse" color="var(--brand-blue)" style="width:18px; height:18px; vertical-align:middle;"></box-icon> Reliability Metric
              </div>
              <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
                <div class="score-bar" style="flex:1; height:8px; background:var(--border); border-radius:4px; overflow:hidden;">
                  <div class="score-fill" style="width:${u.reliabilityScore}%; height:100%; background:var(--brand-blue); border-radius:4px;"></div>
                </div>
                <span class="fw-600 text-purple" style="font-size:14px; font-weight:700; color:var(--brand-blue);">${u.reliabilityScore}%</span>
              </div>
              <div class="text-sm text-muted" style="line-height:1.4;">Shows consistency in deliverability and teamwork on shared projects.</div>
            </div>` : ''}

            <!-- Verified Links & Social Profiles -->
            ${(u.githubUrl || u.portfolioUrl || u.email) ? `
            <div class="card" style="display:flex; flex-direction:column; gap:16px;">
              <div class="card-title" style="font-size:13px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
                <box-icon name="link-alt" color="var(--brand-blue)" style="width:18px; height:18px; vertical-align:middle;"></box-icon> Connections & Links
              </div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${u.githubUrl ? `<a href="${u.githubUrl}" target="_blank" class="btn btn-secondary btn-full btn-sm" style="justify-content:flex-start; text-align:left; font-size:12px; padding:8px 12px;"><box-icon name="github" type="logo" color="currentColor" style="width: 16px; height: 16px; margin-right:8px; vertical-align:middle;"></box-icon> GitHub Profile</a>` : ''}
                ${u.portfolioUrl ? `<a href="${u.portfolioUrl}" target="_blank" class="btn btn-secondary btn-full btn-sm" style="justify-content:flex-start; text-align:left; font-size:12px; padding:8px 12px;"><box-icon name="globe" color="currentColor" style="width: 16px; height: 16px; margin-right:8px; vertical-align:middle;"></box-icon> Personal Portfolio</a>` : ''}
              </div>
              
              ${u.email ? `
                <div style="padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; font-size:12px; color:var(--text-secondary);">
                  <div style="display:flex; align-items:center; gap:6px;"><box-icon name="envelope" color="currentColor" style="width: 14px; height: 14px;"></box-icon> ${u.email}</div>
                  <div style="display:flex; align-items:center; gap:6px;"><box-icon name="calendar-event" color="currentColor" style="width: 14px; height: 14px;"></box-icon> Joined ${formatDate(u.joinedAt)}</div>
                </div>` : ''}
            </div>` : ''}
          </div>
        </div>
      </div>`;
  }

  function openEditModal() {
    if (!profileData) return;
    document.getElementById('edit-name').value = profileData.name || '';
    document.getElementById('edit-title').value = profileData.title || '';
    document.getElementById('edit-bio').value = profileData.bio || '';
    document.getElementById('edit-github').value = profileData.githubUrl || '';
    document.getElementById('edit-portfolio').value = profileData.portfolioUrl || '';
    document.getElementById('edit-avail').value = profileData.availability || 'available';
    document.getElementById('edit-style').value = profileData.workStyle || 'flexible';
    document.getElementById('edit-skills').value = (profileData.skills || []).join(', ');
    document.getElementById('edit-project-types').value = (profileData.projectTypes || []).join(', ');
    updateSkillsPreview();
    openModal('edit-modal');
  }

  function updateSkillsPreview() {
    const val = document.getElementById('edit-skills').value;
    const skills = val.split(',').map(s => s.trim()).filter(Boolean);
    const preview = document.getElementById('skills-preview');
    preview.innerHTML = skills.map(s => `<span class="tag">${s}</span>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const si = document.getElementById('edit-skills');
    if (si) si.addEventListener('input', updateSkillsPreview);
  });

  async function saveProfile() {
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    const skills = document.getElementById('edit-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const projectTypes = document.getElementById('edit-project-types').value.split(',').map(s => s.trim()).filter(Boolean);
    const body = {
      name: document.getElementById('edit-name').value,
      title: document.getElementById('edit-title').value,
      bio: document.getElementById('edit-bio').value,
      githubUrl: document.getElementById('edit-github').value,
      portfolioUrl: document.getElementById('edit-portfolio').value,
      availability: document.getElementById('edit-avail').value,
      workStyle: document.getElementById('edit-style').value,
      skills, projectTypes
    };
    const { ok, data } = await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(body) });
    btn.disabled = false; btn.textContent = 'Save Changes';
    if (ok) {
      profileData = data;
      Session.set(Session.getToken(), Session.getUserId(), data.name);
      closeModal('edit-modal');
      renderProfile(data);
      Toast.show('Profile updated!', 'success');
    } else {
      Toast.show(data.message || 'Failed to save', 'error');
    }
  }

  loadProfile();