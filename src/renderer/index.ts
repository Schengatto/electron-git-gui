document.addEventListener('DOMContentLoaded', () => {
  const selectDirButton = document.getElementById('selectDirectory') as HTMLButtonElement;
  const fetchButton = document.getElementById('fetchBranches') as HTMLButtonElement;
  const stageAllButton = document.getElementById('stageAllFiles') as HTMLButtonElement;
  const selectedDirElement = document.getElementById('selectedDir') as HTMLParagraphElement;
  const currentBranchElement = document.getElementById('currentBranch') as HTMLParagraphElement;
  const branchList = document.getElementById('branchList') as HTMLUListElement;
  const stagedFilesList = document.getElementById('stagedFiles') as HTMLUListElement;
  const changedFilesList = document.getElementById('changedFiles') as HTMLUListElement;
  const errorMessageElement = document.getElementById('errorMessage') as HTMLDivElement;
  const repoContentElement = document.getElementById('repoContent') as HTMLDivElement;
  const statusDisplayElement = document.getElementById('statusDisplay') as HTMLDivElement;

  const unstageAllButton = document.createElement('button');
  unstageAllButton.textContent = 'Unstage All';
  unstageAllButton.style.display = 'none';
  statusDisplayElement.insertBefore(unstageAllButton, stagedFilesList);

  const commitForm = document.createElement('form');
  const commitMessageInput = document.createElement('input');
  commitMessageInput.type = 'text';
  commitMessageInput.placeholder = 'Commit message';
  commitMessageInput.required = true;
  const commitButton = document.createElement('button');
  commitButton.type = 'submit';
  commitButton.textContent = 'Commit';
  commitForm.appendChild(commitMessageInput);
  commitForm.appendChild(commitButton);
  statusDisplayElement.appendChild(commitForm);

  const pushButton = document.createElement('button');
  pushButton.textContent = 'Push';
  const forcePushCheckbox = document.createElement('input');
  forcePushCheckbox.type = 'checkbox';
  const forcePushLabel = document.createElement('label');
  forcePushLabel.textContent = 'Force Push';
  forcePushLabel.appendChild(forcePushCheckbox);
  statusDisplayElement.appendChild(pushButton);
  statusDisplayElement.appendChild(forcePushLabel);

  let selectedDir: string | null = null;

  selectDirButton.addEventListener('click', async () => {
    const dir = await window.electronAPI.openDirectory();
    if (dir) {
      selectedDir = dir;
      selectedDirElement.textContent = `Selected directory: ${dir}`;
      const isRepo = await window.electronAPI.initGit(dir);
      if (isRepo) {
        repoContentElement.style.display = 'block';
        statusDisplayElement.style.display = 'block';
        await updateBranches();
        await updateStatus();
      } else {
        showError('The selected directory is not a Git repository.');
        repoContentElement.style.display = 'none';
        statusDisplayElement.style.display = 'none';
      }
    }
  });

  fetchButton.addEventListener('click', async () => {
    await updateBranches();
    await updateStatus();
  });

  stageAllButton.addEventListener('click', async () => {
    const success = await window.electronAPI.stageAllFiles();
    if (success) {
      await updateStatus();
    } else {
      showError('Failed to stage all files');
    }
  });

  unstageAllButton.addEventListener('click', async () => {
    const success = await window.electronAPI.unstageAllFiles();
    if (success) {
      await updateStatus();
    } else {
      showError('Failed to unstage all files');
    }
  });

  commitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = commitMessageInput.value;
    const success = await window.electronAPI.commit(message);
    if (success) {
      showMessage('Commit successful');
      commitMessageInput.value = '';
      await updateStatus();
    } else {
      showError('Failed to commit');
    }
  });

  pushButton.addEventListener('click', async () => {
    const force = forcePushCheckbox.checked;
    const success = await window.electronAPI.push(force);
    if (success) {
      showMessage(`Push successful${force ? ' (force)' : ''}`);
    } else {
      showError('Failed to push');
    }
  });

  async function updateBranches() {
    if (!selectedDir) return;

    try {
      fetchButton.disabled = true;
      fetchButton.textContent = 'Fetching...';
      
      const { local, remote, current } = await window.electronAPI.fetchAndGetBranches();
      
      currentBranchElement.textContent = `Current branch: ${current}`;
      
      branchList.innerHTML = ''; // Clear existing list
      
      if (local.length > 0) {
        const localHeader = document.createElement('li');
        localHeader.textContent = 'Local Branches';
        localHeader.className = 'header';
        branchList.appendChild(localHeader);
        
        local.forEach(branch => {
          const li = document.createElement('li');
          li.textContent = branch;
          li.className = 'local';
          li.addEventListener('click', () => switchBranch(branch));
          if (branch === current) {
            li.classList.add('current');
          }
          branchList.appendChild(li);
        });
      }
      
      if (remote.length > 0) {
        const remoteHeader = document.createElement('li');
        remoteHeader.textContent = 'Remote Branches';
        remoteHeader.className = 'header';
        branchList.appendChild(remoteHeader);
        
        remote.forEach(branch => {
          const li = document.createElement('li');
          li.textContent = branch;
          li.className = 'remote';
          li.addEventListener('click', () => switchBranch(branch));
          branchList.appendChild(li);
        });
      }

      hideError();
    } catch (error) {
      console.error('Error fetching branches:', error);
      showError('Error fetching branches. Check the console for details.');
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = 'Fetch Branches';
    }
  }

  async function updateStatus() {
    if (!selectedDir) return;

    try {
      const status = await window.electronAPI.getStatus();
      
      stagedFilesList.innerHTML = '';
      changedFilesList.innerHTML = '';

      if (status) {
        status.staged.forEach(file => addFileToList(stagedFilesList, file, 'staged'));
        status.modified.forEach(file => addFileToList(changedFilesList, file, 'modified'));
        status.created.forEach(file => addFileToList(changedFilesList, file, 'new'));
        status.deleted.forEach(file => addFileToList(changedFilesList, file, 'deleted'));
        status.renamed.forEach(file => addFileToList(changedFilesList, `${file.from} → ${file.to}`, 'renamed'));
        status.conflicted.forEach(file => addFileToList(changedFilesList, file, 'conflicted'));

        unstageAllButton.style.display = status.staged.length > 0 ? 'block' : 'none';
      }
    } catch (error) {
      console.error('Error getting repository status:', error);
      showError('Error getting repository status. Check the console for details.');
    }
  }

  function addFileToList(list: HTMLUListElement, file: string, status: string) {
    const li = document.createElement('li');
    li.className = `file-item ${status}`;

    const fileSpan = document.createElement('span');
    fileSpan.textContent = file;
    fileSpan.className = 'file-name';
    li.appendChild(fileSpan);

    const statusSpan = document.createElement('span');
    statusSpan.textContent = status;
    statusSpan.className = 'file-status';
    li.appendChild(statusSpan);

    const actionButton = document.createElement('button');
    actionButton.className = 'file-action';

    if (list === changedFilesList) {
      actionButton.textContent = 'Stage';
      actionButton.addEventListener('click', async () => {
        const success = await window.electronAPI.stageFile(file);
        if (success) {
          await updateStatus();
        } else {
          showError(`Failed to stage file: ${file}`);
        }
      });
    } else {
      actionButton.textContent = 'Unstage';
      actionButton.addEventListener('click', async () => {
        const success = await window.electronAPI.unstageFile(file);
        if (success) {
          await updateStatus();
        } else {
          showError(`Failed to unstage file: ${file}`);
        }
      });
    }

    li.appendChild(actionButton);
    list.appendChild(li);
  }

  async function switchBranch(branchName: string) {
    try {
      const success = await window.electronAPI.switchBranch(branchName);
      if (success) {
        await updateBranches();
        await updateStatus();
        showMessage(`Switched to branch: ${branchName}`);
      } else {
        showError(`Failed to switch to branch: ${branchName}`);
      }
    } catch (error) {
      console.error('Error switching branch:', error);
      showError('Error switching branch. Check the console for details.');
    }
  }

  function showError(message: string) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';
  }

  function hideError() {
    errorMessageElement.style.display = 'none';
  }

  function showMessage(message: string) {
    alert(message);  // For now, we're using alert, but you could create a custom message box in the future
  }
});