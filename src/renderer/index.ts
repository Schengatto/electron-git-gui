document.addEventListener('DOMContentLoaded', () => {
  const pageContainerElement = document.getElementById('pageContainer') as HTMLButtonElement;
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

  let selectedDir: string | null = null;

  if (!selectDirButton || !fetchButton || !stageAllButton || !unstageAllButton || !selectedDirElement ||
    !currentBranchElement || !branchList || !stagedFilesList || !unstagedFilesList || !errorMessageElement ||
    !repoContentElement || !statusDisplayElement) {
    console.error('One or more required elements are missing from the DOM');
    return;
  }

  const updateStatusEvent = new CustomEvent('update-status');

  function updateStatus() {
    pageContainerElement.dispatchEvent(updateStatusEvent);
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
      updateStatus();
    } catch (error) {
      console.error('Error fetching branches:', error);
      showError('Error fetching branches. Check the console for details.');
    } finally {
      fetchButton!.disabled = false;
      fetchButton!.textContent = 'Fetch Branches';
    }
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