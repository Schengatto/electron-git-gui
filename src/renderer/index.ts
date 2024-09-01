document.addEventListener('DOMContentLoaded', () => {
  const selectDirButton = document.getElementById('selectDirectory') as HTMLButtonElement | null;
  const fetchButton = document.getElementById('fetchBranches') as HTMLButtonElement | null;
  const stageAllButton = document.getElementById('stageAllFiles') as HTMLButtonElement | null;
  const unstageAllButton = document.getElementById('unstageAllFiles') as HTMLButtonElement | null;
  const selectedDirElement = document.getElementById('selectedDir') as HTMLParagraphElement | null;
  const currentBranchElement = document.getElementById('currentBranch') as HTMLParagraphElement | null;
  const branchList = document.getElementById('branchList') as HTMLUListElement | null;
  const stagedFilesList = document.getElementById('stagedFiles') as HTMLUListElement | null;
  const unstagedFilesList = document.getElementById('unstagedFiles') as HTMLUListElement | null;
  const errorMessageElement = document.getElementById('errorMessage') as HTMLDivElement | null;
  const repoContentElement = document.getElementById('repoContent') as HTMLDivElement | null;
  const statusDisplayElement = document.getElementById('statusDisplay') as HTMLDivElement | null;
  const commitForm = document.getElementById('commitForm') as HTMLFormElement | null;
  const commitMessageInput = document.getElementById('commitMessage') as HTMLInputElement | null;
  const pushButton = document.getElementById('pushButton') as HTMLButtonElement | null;
  const forcePushCheckbox = document.getElementById('forcePushCheckbox') as HTMLInputElement | null;
  const pushSection = document.getElementById('pushSection') as HTMLDivElement | null;

  let selectedDir: string | null = null;

  if (!selectDirButton || !fetchButton || !stageAllButton || !unstageAllButton || !selectedDirElement ||
    !currentBranchElement || !branchList || !stagedFilesList || !unstagedFilesList || !errorMessageElement ||
    !repoContentElement || !statusDisplayElement || !commitForm || !commitMessageInput || !pushButton ||
    !forcePushCheckbox || !pushSection) {
    console.error('One or more required elements are missing from the DOM');
    return;
  }

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
      await checkPushStatus();
    } else {
      showError('Failed to commit');
    }
  });

  pushButton.addEventListener('click', async () => {
    const force = forcePushCheckbox.checked;
    const success = await window.electronAPI.push(force);
    if (success) {
      showMessage(`Push successful${force ? ' (force)' : ''}`);
      await checkPushStatus();
    } else {
      showError('Failed to push');
    }
  });

  async function updateBranches() {
    if (!selectedDir) return;

    try {
      fetchButton!.disabled = true;
      fetchButton!.textContent = 'Fetching...';

      const { local, remote, current } = await window.electronAPI.fetchAndGetBranches();

      currentBranchElement!.textContent = `Current branch: ${current}`;

      branchList!.innerHTML = ''; // Clear existing list

      if (local.length > 0) {
        const localHeader = document.createElement('li');
        localHeader.textContent = 'Local Branches';
        localHeader.className = 'header';
        branchList!.appendChild(localHeader);

        local.forEach(branch => {
          const li = document.createElement('li');
          li.textContent = branch;
          li.className = 'local';
          li.addEventListener('click', () => switchBranch(branch));
          if (branch === current) {
            li.classList.add('current');
          }
          branchList!.appendChild(li);
        });
      }

      if (remote.length > 0) {
        const remoteHeader = document.createElement('li');
        remoteHeader.textContent = 'Remote Branches';
        remoteHeader.className = 'header';
        branchList!.appendChild(remoteHeader);

        remote.forEach(branch => {
          const li = document.createElement('li');
          li.textContent = branch;
          li.className = 'remote';
          li.addEventListener('click', () => switchBranch(branch));
          branchList!.appendChild(li);
        });
      }

      hideError();
      await checkPushStatus();
    } catch (error) {
      console.error('Error fetching branches:', error);
      showError('Error fetching branches. Check the console for details.');
    } finally {
      fetchButton!.disabled = false;
      fetchButton!.textContent = 'Fetch Branches';
    }
  }

  async function updateStatus() {
    if (!selectedDir) return;

    try {
      const status = await window.electronAPI.getStatus();

      stagedFilesList!.innerHTML = '';

      if (status) {
        const stagedFiles = new Set(status.staged);

        // Update staged files list
        status.staged.forEach(file => addFileToList(stagedFilesList!, file, 'staged'));

        // Remove files from unstagedFilesList that are now staged
        Array.from(unstagedFilesList!.children).forEach((li: Element) => {
          const fileName = (li.querySelector('.file-name') as HTMLElement).textContent;
          if (stagedFiles.has(fileName!)) {
            li.remove();
          }
        });

        // Function to add file to unstaged list if it's not staged
        const addIfUnstaged = (file: string, status: string) => {
          if (!stagedFiles.has(file) && !isFileInList(unstagedFilesList!, file)) {
            addFileToList(unstagedFilesList!, file, status);
          }
        };

        // Add new unstaged files
        status.modified.forEach(file => addIfUnstaged(file, 'modified'));
        status.created.forEach(file => addIfUnstaged(file, 'new'));
        status.deleted.forEach(file => addIfUnstaged(file, 'deleted'));
        status.renamed.forEach(file => {
          const renamedFile = `${file.from} → ${file.to}`;
          addIfUnstaged(renamedFile, 'renamed');
        });
        status.conflicted.forEach(file => addIfUnstaged(file, 'conflicted'));

        unstageAllButton!.style.display = stagedFiles.size > 0 ? 'block' : 'none';
        stageAllButton!.style.display = unstagedFilesList!.children.length > 0 ? 'block' : 'none';
      }
    } catch (error) {
      console.error('Error getting repository status:', error);
      showError('Error getting repository status. Check the console for details.');
    }
  }

  function isFileInList(list: HTMLUListElement, fileName: string): boolean {
    return Array.from(list.children).some((li: Element) =>
      (li.querySelector('.file-name') as HTMLElement).textContent === fileName
    );
  }

  async function checkPushStatus() {
    try {
      const hasCommitsToPush = await window.electronAPI.hasCommitsToPush();
      pushSection!.style.display = hasCommitsToPush ? 'block' : 'none';
    } catch (error) {
      console.error('Error checking push status:', error);
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

    if (list === unstagedFilesList) {
      actionButton.textContent = 'Stage';
      actionButton.addEventListener('click', async () => {
        const success = await window.electronAPI.stageFile(file);
        if (success) {
          li.remove(); // Remove the file from the unstaged list
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
    errorMessageElement!.textContent = message;
    errorMessageElement!.style.display = 'block';
  }

  function hideError() {
    errorMessageElement!.style.display = 'none';
  }

  function showMessage(message: string) {
    alert(message);  // For now, we're using alert, but you could create a custom message box in the future
  }
});